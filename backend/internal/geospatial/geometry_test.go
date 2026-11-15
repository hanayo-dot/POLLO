package geospatial

import (
	"math"
	"testing"

	"github.com/pollo/backend/internal/models"
)

func TestPointValidate(t *testing.T) {
	tests := []struct {
		name    string
		point   Point
		wantErr bool
	}{
		{
			name:    "valid equator/prime meridian point",
			point:   Point{Lon: 0.0, Lat: 0.0},
			wantErr: false,
		},
		{
			name:    "valid Lake Victoria location",
			point:   Point{Lon: 32.5, Lat: -0.5},
			wantErr: false,
		},
		{
			name:    "valid extreme boundary coordinates",
			point:   Point{Lon: 180.0, Lat: -90.0},
			wantErr: false,
		},
		{
			name:    "invalid longitude > 180",
			point:   Point{Lon: 180.1, Lat: 10.0},
			wantErr: true,
		},
		{
			name:    "invalid longitude < -180",
			point:   Point{Lon: -180.5, Lat: 10.0},
			wantErr: true,
		},
		{
			name:    "invalid latitude > 90",
			point:   Point{Lon: 10.0, Lat: 90.5},
			wantErr: true,
		},
		{
			name:    "invalid latitude < -90",
			point:   Point{Lon: 10.0, Lat: -91.0},
			wantErr: true,
		},
		{
			name:    "NaN longitude",
			point:   Point{Lon: math.NaN(), Lat: 0.0},
			wantErr: true,
		},
		{
			name:    "Inf latitude",
			point:   Point{Lon: 0.0, Lat: math.Inf(1)},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.point.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Point.Validate() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateBoundingBox(t *testing.T) {
	tests := []struct {
		name    string
		bbox    models.BoundingBox
		wantErr bool
	}{
		{
			name: "valid Lake Victoria Basin box",
			bbox: models.BoundingBox{
				MinLon: 29.0,
				MinLat: -4.5,
				MaxLon: 36.0,
				MaxLat: 2.5,
			},
			wantErr: false,
		},
		{
			name: "valid point box (zero area)",
			bbox: models.BoundingBox{
				MinLon: 30.0,
				MinLat: 0.0,
				MaxLon: 30.0,
				MaxLat: 0.0,
			},
			wantErr: false,
		},
		{
			name: "invalid inverted longitude (MinLon > MaxLon)",
			bbox: models.BoundingBox{
				MinLon: 36.0,
				MinLat: -4.5,
				MaxLon: 29.0,
				MaxLat: 2.5,
			},
			wantErr: true,
		},
		{
			name: "invalid inverted latitude (MinLat > MaxLat)",
			bbox: models.BoundingBox{
				MinLon: 29.0,
				MinLat: 5.0,
				MaxLon: 36.0,
				MaxLat: 2.5,
			},
			wantErr: true,
		},
		{
			name: "out of range longitude",
			bbox: models.BoundingBox{
				MinLon: -190.0,
				MinLat: -10.0,
				MaxLon: 30.0,
				MaxLat: 10.0,
			},
			wantErr: true,
		},
		{
			name: "out of range latitude",
			bbox: models.BoundingBox{
				MinLon: 20.0,
				MinLat: -10.0,
				MaxLon: 30.0,
				MaxLat: 95.0,
			},
			wantErr: true,
		},
		{
			name: "NaN coordinate",
			bbox: models.BoundingBox{
				MinLon: math.NaN(),
				MinLat: 0.0,
				MaxLon: 10.0,
				MaxLat: 10.0,
			},
			wantErr: true,
		},
		{
			name: "Inf coordinate",
			bbox: models.BoundingBox{
				MinLon: 0.0,
				MinLat: math.Inf(-1),
				MaxLon: 10.0,
				MaxLat: 10.0,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateBoundingBox(tt.bbox)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateBoundingBox() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestBoundingBoxIntersects(t *testing.T) {
	base := models.BoundingBox{
		MinLon: 10.0,
		MinLat: 10.0,
		MaxLon: 20.0,
		MaxLat: 20.0,
	}

	tests := []struct {
		name      string
		other     models.BoundingBox
		wantInter bool
		wantOvlp  bool
	}{
		{
			name: "partially overlapping box",
			other: models.BoundingBox{
				MinLon: 15.0,
				MinLat: 15.0,
				MaxLon: 25.0,
				MaxLat: 25.0,
			},
			wantInter: true,
			wantOvlp:  true,
		},
		{
			name: "completely interior nested box",
			other: models.BoundingBox{
				MinLon: 12.0,
				MinLat: 12.0,
				MaxLon: 18.0,
				MaxLat: 18.0,
			},
			wantInter: true,
			wantOvlp:  true,
		},
		{
			name:      "identical box",
			other:     base,
			wantInter: true,
			wantOvlp:  true,
		},
		{
			name: "touching right edge (sharing longitude 20.0)",
			other: models.BoundingBox{
				MinLon: 20.0,
				MinLat: 10.0,
				MaxLon: 30.0,
				MaxLat: 20.0,
			},
			wantInter: true,
			wantOvlp:  false,
		},
		{
			name: "touching top-right corner (sharing point 20.0, 20.0)",
			other: models.BoundingBox{
				MinLon: 20.0,
				MinLat: 20.0,
				MaxLon: 30.0,
				MaxLat: 30.0,
			},
			wantInter: true,
			wantOvlp:  false,
		},
		{
			name: "disjoint box to the east",
			other: models.BoundingBox{
				MinLon: 25.0,
				MinLat: 10.0,
				MaxLon: 35.0,
				MaxLat: 20.0,
			},
			wantInter: false,
			wantOvlp:  false,
		},
		{
			name: "disjoint box to the south",
			other: models.BoundingBox{
				MinLon: 10.0,
				MinLat: 0.0,
				MaxLon: 20.0,
				MaxLat: 5.0,
			},
			wantInter: false,
			wantOvlp:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotInter := BoundingBoxIntersects(base, tt.other)
			if gotInter != tt.wantInter {
				t.Errorf("BoundingBoxIntersects() = %v, want %v", gotInter, tt.wantInter)
			}
			// Commutativity
			if BoundingBoxIntersects(tt.other, base) != tt.wantInter {
				t.Errorf("BoundingBoxIntersects() commutative symmetry failed")
			}

			gotOvlp := BoundingBoxOverlaps(base, tt.other)
			if gotOvlp != tt.wantOvlp {
				t.Errorf("BoundingBoxOverlaps() = %v, want %v", gotOvlp, tt.wantOvlp)
			}
		})
	}
}

func TestBoundingBoxIntersection(t *testing.T) {
	b1 := models.BoundingBox{MinLon: 10.0, MinLat: 10.0, MaxLon: 20.0, MaxLat: 20.0}
	b2 := models.BoundingBox{MinLon: 15.0, MinLat: 12.0, MaxLon: 25.0, MaxLat: 22.0}

	inter, ok := BoundingBoxIntersection(b1, b2)
	if !ok {
		t.Fatalf("expected intersection, got false")
	}

	expected := models.BoundingBox{MinLon: 15.0, MinLat: 12.0, MaxLon: 20.0, MaxLat: 20.0}
	if inter != expected {
		t.Errorf("expected intersection %v, got %v", expected, inter)
	}

	// Disjoint intersection
	b3 := models.BoundingBox{MinLon: 30.0, MinLat: 30.0, MaxLon: 40.0, MaxLat: 40.0}
	_, ok = BoundingBoxIntersection(b1, b3)
	if ok {
		t.Errorf("expected false for disjoint boxes, got true")
	}
}

func TestBoundingBoxContainsPoint(t *testing.T) {
	b := models.BoundingBox{MinLon: 0.0, MinLat: 0.0, MaxLon: 10.0, MaxLat: 10.0}

	tests := []struct {
		name string
		p    Point
		want bool
	}{
		{"strictly inside", Point{Lon: 5.0, Lat: 5.0}, true},
		{"on left edge", Point{Lon: 0.0, Lat: 5.0}, true},
		{"on bottom-left corner", Point{Lon: 0.0, Lat: 0.0}, true},
		{"on top-right corner", Point{Lon: 10.0, Lat: 10.0}, true},
		{"outside to the west", Point{Lon: -0.01, Lat: 5.0}, false},
		{"outside to the north", Point{Lon: 5.0, Lat: 10.01}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := BoundingBoxContainsPoint(b, tt.p); got != tt.want {
				t.Errorf("BoundingBoxContainsPoint(%v) = %v, want %v", tt.p, got, tt.want)
			}
		})
	}
}

func TestBoundingBoxContainsBBox(t *testing.T) {
	outer := models.BoundingBox{MinLon: 0.0, MinLat: 0.0, MaxLon: 20.0, MaxLat: 20.0}
	inner := models.BoundingBox{MinLon: 5.0, MinLat: 5.0, MaxLon: 15.0, MaxLat: 15.0}
	partial := models.BoundingBox{MinLon: 15.0, MinLat: 15.0, MaxLon: 25.0, MaxLat: 25.0}

	if !BoundingBoxContainsBBox(outer, inner) {
		t.Errorf("expected outer to contain inner")
	}
	if BoundingBoxContainsBBox(inner, outer) {
		t.Errorf("inner should not contain outer")
	}
	if BoundingBoxContainsBBox(outer, partial) {
		t.Errorf("outer should not contain partially overlapping box")
	}
	if !BoundingBoxContainsBBox(outer, outer) {
		t.Errorf("bbox should contain itself")
	}
}

func TestPointsBoundingBox(t *testing.T) {
	pts := []Point{
		{Lon: 10.0, Lat: -5.0},
		{Lon: 25.0, Lat: 15.0},
		{Lon: 5.0, Lat: 20.0},
		{Lon: 18.0, Lat: 0.0},
	}

	bbox, err := PointsBoundingBox(pts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := models.BoundingBox{MinLon: 5.0, MinLat: -5.0, MaxLon: 25.0, MaxLat: 20.0}
	if bbox != expected {
		t.Errorf("expected %v, got %v", expected, bbox)
	}

	// Empty slice test
	_, err = PointsBoundingBox([]Point{})
	if err == nil {
		t.Errorf("expected error for empty slice, got nil")
	}
}

func TestBoundingBoxUnion(t *testing.T) {
	b1 := models.BoundingBox{MinLon: 0.0, MinLat: 0.0, MaxLon: 10.0, MaxLat: 10.0}
	b2 := models.BoundingBox{MinLon: 15.0, MinLat: 5.0, MaxLon: 25.0, MaxLat: 20.0}

	union := BoundingBoxUnion(b1, b2)
	expected := models.BoundingBox{MinLon: 0.0, MinLat: 0.0, MaxLon: 25.0, MaxLat: 20.0}
	if union != expected {
		t.Errorf("expected union %v, got %v", expected, union)
	}
}

func TestBoundingBoxAreaAndApprox(t *testing.T) {
	b := models.BoundingBox{MinLon: 0.0, MinLat: 0.0, MaxLon: 1.0, MaxLat: 1.0}

	degArea := BoundingBoxArea(b)
	if math.Abs(degArea-1.0) > 1e-9 {
		t.Errorf("expected deg area 1.0, got %f", degArea)
	}

	// 1 deg x 1 deg at equator has width ~ 111.32 km, height ~ 110.57 km -> ~ 12,300 km^2
	sqKm := BoundingBoxApproxAreaSqKm(b)
	if sqKm < 12000 || sqKm > 12500 {
		t.Errorf("expected ~12,300 km^2 at equator, got %f", sqKm)
	}
}
