package geospatial

import (
	"math"
	"testing"
)

func TestRingValidateAndArea(t *testing.T) {
	// Counter-clockwise square [0,0] -> [10,0] -> [10,10] -> [0,10] -> [0,0]
	ccw := Ring{
		{Lon: 0, Lat: 0},
		{Lon: 10, Lat: 0},
		{Lon: 10, Lat: 10},
		{Lon: 0, Lat: 10},
		{Lon: 0, Lat: 0},
	}
	if err := ccw.Validate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	areaCCW := ccw.SignedArea()
	if math.Abs(areaCCW-100.0) > 1e-9 {
		t.Errorf("expected CCW area 100.0, got %f", areaCCW)
	}

	// Clockwise square
	cw := Ring{
		{Lon: 0, Lat: 0},
		{Lon: 0, Lat: 10},
		{Lon: 10, Lat: 10},
		{Lon: 10, Lat: 0},
		{Lon: 0, Lat: 0},
	}
	areaCW := cw.SignedArea()
	if math.Abs(areaCW-(-100.0)) > 1e-9 {
		t.Errorf("expected CW area -100.0, got %f", areaCW)
	}

	// Unclosed ring fails validation
	unclosed := Ring{
		{Lon: 0, Lat: 0},
		{Lon: 10, Lat: 0},
		{Lon: 10, Lat: 10},
		{Lon: 0, Lat: 10},
	}
	if err := unclosed.Validate(); err == nil {
		t.Errorf("expected error for unclosed ring, got nil")
	}

	// Fewer than 4 points fails validation
	tooFew := Ring{
		{Lon: 0, Lat: 0},
		{Lon: 10, Lat: 0},
		{Lon: 0, Lat: 0},
	}
	if err := tooFew.Validate(); err == nil {
		t.Errorf("expected error for ring with <4 points, got nil")
	}
}

func TestRingValidationRigorous(t *testing.T) {
	// Table-driven tests for strengthened ring validation (Finding 5)
	tests := []struct {
		name    string
		ring    Ring
		wantErr bool
	}{
		{
			name: "valid CCW square",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 5, Lat: 0},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: false,
		},
		{
			name: "valid polygon with collinear intermediate vertex on edge",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 10, Lat: 0},
				{Lon: 10, Lat: 10},
				{Lon: 5, Lat: 10}, // Intermediate vertex on top edge (valid, non-reversing)
				{Lon: 0, Lat: 10},
				{Lon: 0, Lat: 0},
			},
			wantErr: false,
		},
		{
			name: "invalid: consecutive duplicate vertices",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 5, Lat: 0},
				{Lon: 5, Lat: 0}, // Duplicate
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: fewer than 3 distinct vertices",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 0},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: degenerate collinear zero area",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 2, Lat: 2},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: self-intersecting crossing bowtie",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 10, Lat: 10},
				{Lon: 0, Lat: 10},
				{Lon: 10, Lat: 0},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: asymmetric crossing bowtie with non-zero net area",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 10, Lat: 12},
				{Lon: 0, Lat: 10},
				{Lon: 10, Lat: 0},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: self-touching vertex (pinched figure-8)",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 10},
				{Lon: 5, Lat: 5}, // Touches prior vertex
				{Lon: 10, Lat: 10},
				{Lon: 10, Lat: 0},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: backtracking spike",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 10, Lat: 0},
				{Lon: 5, Lat: 0}, // Backtracks 180° along segment
				{Lon: 10, Lat: 10},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: NaN coordinate",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: math.NaN(), Lat: 5},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: Inf coordinate",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 5, Lat: math.Inf(1)},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: out-of-range longitude",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 185.0, Lat: 0},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
		{
			name: "invalid: out-of-range latitude",
			ring: Ring{
				{Lon: 0, Lat: 0},
				{Lon: 5, Lat: 95.0},
				{Lon: 5, Lat: 5},
				{Lon: 0, Lat: 0},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.ring.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr = %v", err, tt.wantErr)
			}
			// Verify NewPolygon also rejects invalid rings
			_, polyErr := NewPolygon(tt.ring)
			if (polyErr != nil) != tt.wantErr {
				t.Errorf("NewPolygon() error = %v, wantErr = %v", polyErr, tt.wantErr)
			}
		})
	}
}

func TestPolygonConvex(t *testing.T) {
	poly, err := NewPolygon(Ring{
		{Lon: 0, Lat: 0},
		{Lon: 10, Lat: 0},
		{Lon: 10, Lat: 10},
		{Lon: 0, Lat: 10},
		{Lon: 0, Lat: 0},
	})
	if err != nil {
		t.Fatalf("failed to create polygon: %v", err)
	}

	tests := []struct {
		name     string
		pt       Point
		wantLoc  PointLocation
		wantCont bool
	}{
		{"strictly inside center", Point{Lon: 5, Lat: 5}, PointInside, true},
		{"strictly outside west", Point{Lon: -2, Lat: 5}, PointOutside, false},
		{"strictly outside east", Point{Lon: 12, Lat: 5}, PointOutside, false},
		{"strictly outside south", Point{Lon: 5, Lat: -1}, PointOutside, false},
		{"strictly outside north", Point{Lon: 5, Lat: 11}, PointOutside, false},
		{"on south edge", Point{Lon: 5, Lat: 0}, PointOnBoundary, true},
		{"on east edge", Point{Lon: 10, Lat: 5}, PointOnBoundary, true},
		{"on north edge", Point{Lon: 5, Lat: 10}, PointOnBoundary, true},
		{"on west edge", Point{Lon: 0, Lat: 5}, PointOnBoundary, true},
		{"on vertex corner", Point{Lon: 10, Lat: 10}, PointOnBoundary, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotLoc := poly.Locate(tt.pt)
			if gotLoc != tt.wantLoc {
				t.Errorf("Locate(%v) = %v, want %v", tt.pt, gotLoc, tt.wantLoc)
			}
			gotCont := poly.Contains(tt.pt)
			if gotCont != tt.wantCont {
				t.Errorf("Contains(%v) = %v, want %v", tt.pt, gotCont, tt.wantCont)
			}
		})
	}
}

func TestPolygonConcaveU_Shape(t *testing.T) {
	// "U" shape polygon:
	// (0,10) ------------ (10,10)
	//   |                   |
	// (0,0) -- (4,0) (6,0) (10,0)
	//            |     |
	//          (4,6)-(6,6)
	uRing := Ring{
		{Lon: 0, Lat: 0},
		{Lon: 10, Lat: 0},
		{Lon: 10, Lat: 10},
		{Lon: 7, Lat: 10},
		{Lon: 7, Lat: 3},
		{Lon: 3, Lat: 3},
		{Lon: 3, Lat: 10},
		{Lon: 0, Lat: 10},
		{Lon: 0, Lat: 0},
	}

	poly, err := NewPolygon(uRing)
	if err != nil {
		t.Fatalf("failed to create concave polygon: %v", err)
	}

	// Point in the cutout bay: Lon=5, Lat=6 (within bbox [0,0,10,10], but outside the U)
	cutoutPt := Point{Lon: 5, Lat: 6}
	if poly.Locate(cutoutPt) != PointOutside {
		t.Errorf("expected cutout point to be outside, got %v", poly.Locate(cutoutPt))
	}
	if poly.Contains(cutoutPt) {
		t.Errorf("cutout point should not be contained in U shape")
	}

	// Point in left limb
	leftLimb := Point{Lon: 1.5, Lat: 6}
	if poly.Locate(leftLimb) != PointInside {
		t.Errorf("expected left limb to be inside, got %v", poly.Locate(leftLimb))
	}

	// Point in bottom bar
	bottomBar := Point{Lon: 5, Lat: 1.5}
	if poly.Locate(bottomBar) != PointInside {
		t.Errorf("expected bottom bar to be inside, got %v", poly.Locate(bottomBar))
	}

	// Ray aligned with vertex in cutout: Lat=3
	vertexLevelInside := Point{Lon: 1.5, Lat: 3}
	if poly.Locate(vertexLevelInside) != PointInside {
		t.Errorf("expected point at vertex latitude to be inside left limb, got %v", poly.Locate(vertexLevelInside))
	}
	vertexLevelCutout := Point{Lon: 5, Lat: 3}
	// (5, 3) lies on the horizontal segment between (3,3) and (7,3)!
	if poly.Locate(vertexLevelCutout) != PointOnBoundary {
		t.Errorf("expected point (5,3) on segment (3,3)-(7,3) to be on boundary, got %v", poly.Locate(vertexLevelCutout))
	}
}

func TestPolygonWithHole(t *testing.T) {
	// Outer box [0,0] to [10,10]
	outer := Ring{
		{Lon: 0, Lat: 0},
		{Lon: 10, Lat: 0},
		{Lon: 10, Lat: 10},
		{Lon: 0, Lat: 10},
		{Lon: 0, Lat: 0},
	}
	// Hole [3,3] to [7,7]
	hole := Ring{
		{Lon: 3, Lat: 3},
		{Lon: 7, Lat: 3},
		{Lon: 7, Lat: 7},
		{Lon: 3, Lat: 7},
		{Lon: 3, Lat: 3},
	}

	poly, err := NewPolygon(outer, hole)
	if err != nil {
		t.Fatalf("failed to create polygon with hole: %v", err)
	}

	// Point in solid region
	solidPt := Point{Lon: 1.5, Lat: 1.5}
	if poly.Locate(solidPt) != PointInside {
		t.Errorf("expected solid point to be inside, got %v", poly.Locate(solidPt))
	}

	// Point inside hole
	holePt := Point{Lon: 5, Lat: 5}
	if poly.Locate(holePt) != PointOutside {
		t.Errorf("expected point in hole to be outside, got %v", poly.Locate(holePt))
	}
	if poly.Contains(holePt) {
		t.Errorf("point in hole must not be contained")
	}

	// Point on hole boundary
	holeEdge := Point{Lon: 5, Lat: 3}
	if poly.Locate(holeEdge) != PointOnBoundary {
		t.Errorf("expected point on hole edge to be PointOnBoundary, got %v", poly.Locate(holeEdge))
	}
	if !poly.Contains(holeEdge) {
		t.Errorf("point on hole boundary should be considered contained")
	}
}

func TestMultiPolygon(t *testing.T) {
	// Island 1: [0,0] to [2,2]
	island1, _ := NewPolygon(Ring{
		{Lon: 0, Lat: 0},
		{Lon: 2, Lat: 0},
		{Lon: 2, Lat: 2},
		{Lon: 0, Lat: 2},
	})
	// Island 2: [10,10] to [12,12]
	island2, _ := NewPolygon(Ring{
		{Lon: 10, Lat: 10},
		{Lon: 12, Lat: 10},
		{Lon: 12, Lat: 12},
		{Lon: 10, Lat: 12},
	})

	mp, err := NewMultiPolygon(island1, island2)
	if err != nil {
		t.Fatalf("failed to create MultiPolygon: %v", err)
	}

	// Envelope check
	bbox := mp.BoundingBox()
	if bbox.MinLon != 0 || bbox.MinLat != 0 || bbox.MaxLon != 12 || bbox.MaxLat != 12 {
		t.Errorf("unexpected MultiPolygon bbox: %v", bbox)
	}

	// Inside Island 1
	if !mp.Contains(Point{Lon: 1, Lat: 1}) {
		t.Errorf("expected point in Island 1 to be contained")
	}
	// Inside Island 2
	if !mp.Contains(Point{Lon: 11, Lat: 11}) {
		t.Errorf("expected point in Island 2 to be contained")
	}
	// In the sea between islands
	if mp.Contains(Point{Lon: 5, Lat: 5}) {
		t.Errorf("point between islands must not be contained")
	}
	// On boundary of Island 1
	if mp.Locate(Point{Lon: 0, Lat: 1}) != PointOnBoundary {
		t.Errorf("expected PointOnBoundary on Island 1 edge")
	}
}

func TestPolygonAutoClose(t *testing.T) {
	// Unclosed ring passed to NewPolygon should be automatically closed
	poly, err := NewPolygon(Ring{
		{Lon: 0, Lat: 0},
		{Lon: 4, Lat: 0},
		{Lon: 4, Lat: 4},
		{Lon: 0, Lat: 4},
	})
	if err != nil {
		t.Fatalf("expected auto-closure without error, got %v", err)
	}
	if len(poly.Exterior) != 5 {
		t.Errorf("expected exterior length 5, got %d", len(poly.Exterior))
	}
	if poly.Exterior[0] != poly.Exterior[4] {
		t.Errorf("expected first and last point to match after auto-closure")
	}
}
