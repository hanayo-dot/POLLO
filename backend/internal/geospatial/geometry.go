package geospatial

import (
	"errors"
	"fmt"
	"math"

	"github.com/pollo/backend/internal/models"
)

// Point represents a geographic coordinate in decimal degrees (WGS84 / EPSG:4326).
type Point struct {
	Lon float64 `json:"lon"`
	Lat float64 `json:"lat"`
}

// Validate checks whether the point coordinates are within valid geographic bounds.
func (p Point) Validate() error {
	if math.IsNaN(p.Lon) || math.IsInf(p.Lon, 0) {
		return errors.New("longitude must be a finite number")
	}
	if math.IsNaN(p.Lat) || math.IsInf(p.Lat, 0) {
		return errors.New("latitude must be a finite number")
	}
	if p.Lon < -180.0 || p.Lon > 180.0 {
		return fmt.Errorf("longitude %f is out of valid range [-180, 180]", p.Lon)
	}
	if p.Lat < -90.0 || p.Lat > 90.0 {
		return fmt.Errorf("latitude %f is out of valid range [-90, 90]", p.Lat)
	}
	return nil
}

// ValidateBoundingBox verifies that a bounding box is well-formed with valid coordinates.
func ValidateBoundingBox(b models.BoundingBox) error {
	if math.IsNaN(b.MinLon) || math.IsInf(b.MinLon, 0) ||
		math.IsNaN(b.MaxLon) || math.IsInf(b.MaxLon, 0) ||
		math.IsNaN(b.MinLat) || math.IsInf(b.MinLat, 0) ||
		math.IsNaN(b.MaxLat) || math.IsInf(b.MaxLat, 0) {
		return errors.New("bounding box coordinates must be finite numbers")
	}

	if b.MinLon < -180.0 || b.MaxLon > 180.0 {
		return fmt.Errorf("longitude bounds [%f, %f] outside [-180, 180]", b.MinLon, b.MaxLon)
	}
	if b.MinLat < -90.0 || b.MaxLat > 90.0 {
		return fmt.Errorf("latitude bounds [%f, %f] outside [-90, 90]", b.MinLat, b.MaxLat)
	}

	if b.MinLon > b.MaxLon {
		return fmt.Errorf("invalid longitude range: MinLon (%f) > MaxLon (%f)", b.MinLon, b.MaxLon)
	}
	if b.MinLat > b.MaxLat {
		return fmt.Errorf("invalid latitude range: MinLat (%f) > MaxLat (%f)", b.MinLat, b.MaxLat)
	}

	return nil
}

// BoundingBoxIntersects checks if two bounding boxes intersect, including touching on edges or vertices.
func BoundingBoxIntersects(a, b models.BoundingBox) bool {
	if a.MaxLon < b.MinLon || a.MinLon > b.MaxLon {
		return false
	}
	if a.MaxLat < b.MinLat || a.MinLat > b.MaxLat {
		return false
	}
	return true
}

// BoundingBoxOverlaps checks if two bounding boxes have a non-zero area interior overlap.
func BoundingBoxOverlaps(a, b models.BoundingBox) bool {
	if a.MaxLon <= b.MinLon || a.MinLon >= b.MaxLon {
		return false
	}
	if a.MaxLat <= b.MinLat || a.MinLat >= b.MaxLat {
		return false
	}
	return true
}

// BoundingBoxIntersection computes the intersecting bounding box between a and b.
// Returns the intersection bounding box and true if they intersect, or empty box and false otherwise.
func BoundingBoxIntersection(a, b models.BoundingBox) (models.BoundingBox, bool) {
	if !BoundingBoxIntersects(a, b) {
		return models.BoundingBox{}, false
	}

	return models.BoundingBox{
		MinLon: math.Max(a.MinLon, b.MinLon),
		MinLat: math.Max(a.MinLat, b.MinLat),
		MaxLon: math.Min(a.MaxLon, b.MaxLon),
		MaxLat: math.Min(a.MaxLat, b.MaxLat),
	}, true
}

// BoundingBoxContainsPoint checks whether a point lies inside or on the boundary of the bounding box.
func BoundingBoxContainsPoint(b models.BoundingBox, p Point) bool {
	return p.Lon >= b.MinLon && p.Lon <= b.MaxLon &&
		p.Lat >= b.MinLat && p.Lat <= b.MaxLat
}

// BoundingBoxContainsBBox checks whether the outer bounding box completely encloses the inner bounding box.
func BoundingBoxContainsBBox(outer, inner models.BoundingBox) bool {
	return outer.MinLon <= inner.MinLon && outer.MaxLon >= inner.MaxLon &&
		outer.MinLat <= inner.MinLat && outer.MaxLat >= inner.MaxLat
}

// BoundingBoxUnion computes the minimal bounding box enclosing both a and b.
func BoundingBoxUnion(a, b models.BoundingBox) models.BoundingBox {
	return models.BoundingBox{
		MinLon: math.Min(a.MinLon, b.MinLon),
		MinLat: math.Min(a.MinLat, b.MinLat),
		MaxLon: math.Max(a.MaxLon, b.MaxLon),
		MaxLat: math.Max(a.MaxLat, b.MaxLat),
	}
}

// PointsBoundingBox computes the minimal bounding box that encloses the provided slice of points.
func PointsBoundingBox(points []Point) (models.BoundingBox, error) {
	if len(points) == 0 {
		return models.BoundingBox{}, errors.New("cannot compute bounding box of empty point slice")
	}

	minLon := points[0].Lon
	maxLon := points[0].Lon
	minLat := points[0].Lat
	maxLat := points[0].Lat

	for _, p := range points[1:] {
		if p.Lon < minLon {
			minLon = p.Lon
		}
		if p.Lon > maxLon {
			maxLon = p.Lon
		}
		if p.Lat < minLat {
			minLat = p.Lat
		}
		if p.Lat > maxLat {
			maxLat = p.Lat
		}
	}

	return models.BoundingBox{
		MinLon: minLon,
		MinLat: minLat,
		MaxLon: maxLon,
		MaxLat: maxLat,
	}, nil
}

// BoundingBoxArea returns the angular area in square degrees.
func BoundingBoxArea(b models.BoundingBox) float64 {
	dLon := b.MaxLon - b.MinLon
	dLat := b.MaxLat - b.MinLat
	if dLon < 0 || dLat < 0 {
		return 0
	}
	return dLon * dLat
}

// BoundingBoxApproxAreaSqKm calculates the approximate spherical surface area of the bounding box in km^2
// using the authalic Earth radius R = 6371.0088 km.
func BoundingBoxApproxAreaSqKm(b models.BoundingBox) float64 {
	if err := ValidateBoundingBox(b); err != nil {
		return 0
	}
	const earthRadiusKm = 6371.0088
	const degToRad = math.Pi / 180.0

	dLonRad := (b.MaxLon - b.MinLon) * degToRad
	sinLatMin := math.Sin(b.MinLat * degToRad)
	sinLatMax := math.Sin(b.MaxLat * degToRad)

	area := (earthRadiusKm * earthRadiusKm) * dLonRad * (sinLatMax - sinLatMin)
	return math.Abs(area)
}
