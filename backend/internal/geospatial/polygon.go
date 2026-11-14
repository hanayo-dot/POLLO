package geospatial

import (
	"errors"
	"fmt"
	"math"

	"github.com/pollo/backend/internal/models"
)

// PointLocation represents the topological relationship of a point to a geometry.
type PointLocation int

const (
	PointOutside PointLocation = iota
	PointInside
	PointOnBoundary
)

// Ring represents a linear ring forming a closed boundary.
type Ring []Point

// SignedArea returns the signed area of the ring in square degrees using the Shoelace formula.
// A positive area indicates counter-clockwise orientation; negative indicates clockwise.
func (r Ring) SignedArea() float64 {
	n := len(r)
	if n < 3 {
		return 0
	}
	area := 0.0
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		area += (r[i].Lon * r[j].Lat) - (r[j].Lon * r[i].Lat)
	}
	return area / 2.0
}

// Validate verifies that the ring has at least 3 distinct vertices and is closed.
func (r Ring) Validate() error {
	n := len(r)
	if n < 4 {
		return fmt.Errorf("linear ring must contain at least 4 points (including closure), got %d", n)
	}
	for i, pt := range r {
		if err := pt.Validate(); err != nil {
			return fmt.Errorf("point %d in ring is invalid: %w", i, err)
		}
	}
	first := r[0]
	last := r[n-1]
	const eps = 1e-9
	if math.Abs(first.Lon-last.Lon) > eps || math.Abs(first.Lat-last.Lat) > eps {
		return fmt.Errorf("linear ring is not closed: first point (%f, %f) != last point (%f, %f)",
			first.Lon, first.Lat, last.Lon, last.Lat)
	}
	return nil
}

// Polygon represents a 2D planar polygon consisting of an exterior ring and optional interior hole rings.
type Polygon struct {
	Exterior Ring               `json:"exterior"`
	Holes    []Ring             `json:"holes,omitempty"`
	bbox     models.BoundingBox // Cached envelope for O(1) rejection
}

// NewPolygon constructs and validates a Polygon, ensuring proper closure and caching its bounding box.
func NewPolygon(exterior Ring, holes ...Ring) (*Polygon, error) {
	// Auto-close exterior ring if not closed but has at least 3 points
	ext := make(Ring, len(exterior))
	copy(ext, exterior)
	if len(ext) >= 3 {
		first := ext[0]
		last := ext[len(ext)-1]
		const eps = 1e-9
		if math.Abs(first.Lon-last.Lon) > eps || math.Abs(first.Lat-last.Lat) > eps {
			ext = append(ext, first)
		}
	}

	if err := ext.Validate(); err != nil {
		return nil, fmt.Errorf("invalid exterior ring: %w", err)
	}

	processedHoles := make([]Ring, 0, len(holes))
	for i, h := range holes {
		holeRing := make(Ring, len(h))
		copy(holeRing, h)
		if len(holeRing) >= 3 {
			first := holeRing[0]
			last := holeRing[len(holeRing)-1]
			const eps = 1e-9
			if math.Abs(first.Lon-last.Lon) > eps || math.Abs(first.Lat-last.Lat) > eps {
				holeRing = append(holeRing, first)
			}
		}
		if err := holeRing.Validate(); err != nil {
			return nil, fmt.Errorf("invalid hole ring %d: %w", i, err)
		}
		processedHoles = append(processedHoles, holeRing)
	}

	bbox, err := PointsBoundingBox(ext)
	if err != nil {
		return nil, err
	}

	return &Polygon{
		Exterior: ext,
		Holes:    processedHoles,
		bbox:     bbox,
	}, nil
}

// BoundingBox returns the cached bounding box envelope of the polygon.
func (p *Polygon) BoundingBox() models.BoundingBox {
	return p.bbox
}

// Locate determines whether the point is inside, on the boundary of, or outside the polygon.
func (p *Polygon) Locate(pt Point) PointLocation {
	// 1. Fast O(1) bounding box rejection
	if !BoundingBoxContainsPoint(p.bbox, pt) {
		return PointOutside
	}

	// 2. Check if point is on the exterior boundary
	if isPointOnRingBoundary(p.Exterior, pt) {
		return PointOnBoundary
	}

	// 3. Test exterior ring using ray-casting
	if !isPointInRing(p.Exterior, pt) {
		return PointOutside
	}

	// 4. Test interior holes
	for _, hole := range p.Holes {
		if isPointOnRingBoundary(hole, pt) {
			return PointOnBoundary
		}
		if isPointInRing(hole, pt) {
			return PointOutside // Point inside a hole is outside the polygon
		}
	}

	return PointInside
}

// Contains returns true if the point lies inside or on the boundary of the polygon.
func (p *Polygon) Contains(pt Point) bool {
	loc := p.Locate(pt)
	return loc == PointInside || loc == PointOnBoundary
}

// MultiPolygon represents a collection of independent polygons forming a unified region.
type MultiPolygon struct {
	Polygons []*Polygon         `json:"polygons"`
	bbox     models.BoundingBox // Cached union bounding box
}

// NewMultiPolygon constructs a MultiPolygon from one or more polygons.
func NewMultiPolygon(polys ...*Polygon) (*MultiPolygon, error) {
	if len(polys) == 0 {
		return nil, errors.New("cannot create MultiPolygon from empty polygon slice")
	}

	unionBBox := polys[0].BoundingBox()
	for _, poly := range polys[1:] {
		unionBBox = BoundingBoxUnion(unionBBox, poly.BoundingBox())
	}

	return &MultiPolygon{
		Polygons: polys,
		bbox:     unionBBox,
	}, nil
}

// BoundingBox returns the union bounding box envelope of the multi-polygon.
func (mp *MultiPolygon) BoundingBox() models.BoundingBox {
	return mp.bbox
}

// Locate returns PointInside if inside any polygon, PointOnBoundary if on any boundary, else PointOutside.
func (mp *MultiPolygon) Locate(pt Point) PointLocation {
	if !BoundingBoxContainsPoint(mp.bbox, pt) {
		return PointOutside
	}

	hasBoundary := false
	for _, poly := range mp.Polygons {
		loc := poly.Locate(pt)
		if loc == PointInside {
			return PointInside
		}
		if loc == PointOnBoundary {
			hasBoundary = true
		}
	}

	if hasBoundary {
		return PointOnBoundary
	}
	return PointOutside
}

// Contains returns true if the point is inside or on the boundary of any polygon in the multi-polygon.
func (mp *MultiPolygon) Contains(pt Point) bool {
	loc := mp.Locate(pt)
	return loc == PointInside || loc == PointOnBoundary
}

// isPointInRing implements the even-odd ray casting algorithm using half-open intervals.
func isPointInRing(ring Ring, pt Point) bool {
	n := len(ring)
	inside := false

	for i := 0; i < n-1; i++ {
		v1 := ring[i]
		v2 := ring[i+1]

		// Check if horizontal ray at pt.Lat intersects segment (v1, v2)
		// The half-open condition strictly handles vertex crossing without double counting
		if (v1.Lat > pt.Lat) != (v2.Lat > pt.Lat) {
			xIntersect := v1.Lon + (pt.Lat-v1.Lat)*(v2.Lon-v1.Lon)/(v2.Lat-v1.Lat)
			if pt.Lon < xIntersect {
				inside = !inside
			}
		}
	}

	return inside
}

// isPointOnRingBoundary tests if point pt lies within epsilon distance of any segment of the ring.
func isPointOnRingBoundary(ring Ring, pt Point) bool {
	const eps = 1e-9
	n := len(ring)

	for i := 0; i < n-1; i++ {
		v1 := ring[i]
		v2 := ring[i+1]

		// Bounding box of segment check first
		minLon := math.Min(v1.Lon, v2.Lon) - eps
		maxLon := math.Max(v1.Lon, v2.Lon) + eps
		minLat := math.Min(v1.Lat, v2.Lat) - eps
		maxLat := math.Max(v1.Lat, v2.Lat) + eps

		if pt.Lon < minLon || pt.Lon > maxLon || pt.Lat < minLat || pt.Lat > maxLat {
			continue
		}

		// Distance from point to line segment
		dx := v2.Lon - v1.Lon
		dy := v2.Lat - v1.Lat
		segLenSq := dx*dx + dy*dy

		if segLenSq < eps*eps {
			// Degenerate segment (point)
			distSq := (pt.Lon-v1.Lon)*(pt.Lon-v1.Lon) + (pt.Lat-v1.Lat)*(pt.Lat-v1.Lat)
			if distSq <= eps*eps {
				return true
			}
			continue
		}

		// Project pt onto segment: t = ((p - v1) . (v2 - v1)) / |v2 - v1|^2
		t := ((pt.Lon-v1.Lon)*dx + (pt.Lat-v1.Lat)*dy) / segLenSq
		if t < 0.0 {
			t = 0.0
		} else if t > 1.0 {
			t = 1.0
		}

		projLon := v1.Lon + t*dx
		projLat := v1.Lat + t*dy

		distSq := (pt.Lon-projLon)*(pt.Lon-projLon) + (pt.Lat-projLat)*(pt.Lat-projLat)
		if distSq <= eps*eps {
			return true
		}
	}

	return false
}
