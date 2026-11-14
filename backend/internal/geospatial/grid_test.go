package geospatial

import (
	"math"
	"testing"

	"github.com/pollo/backend/internal/models"
)

func TestParseResolution(t *testing.T) {
	tests := []struct {
		input   string
		wantDx  float64
		wantDy  float64
		wantCRS string
		wantErr bool
	}{
		{"0.1° (~10 km)", 0.1, 0.1, CRS_EPSG4326, false},
		{"0.5° × 0.625°", 0.625, 0.5, CRS_EPSG4326, false},
		{"0.5°", 0.5, 0.5, CRS_EPSG4326, false},
		{"9 km EASE-Grid", 9024.13066, 9024.13066, CRS_EPSG6933, false},
		{"9 km EASE-Grid 2.0 (EPSG:6933)", 9024.13066, 9024.13066, CRS_EPSG6933, false},
		{"9 km Approx Geographic", 9.0 / 111.32, 9.0 / 111.32, CRS_EPSG4326, false},
		{"0.05° (~5.6 km)", 0.05, 0.05, CRS_EPSG4326, false},
		{"unknown resolution", 0, 0, "", true},
		{"", 0, 0, "", true},
		{"   ", 0, 0, "", true},
		{"0.25° misspelled", 0, 0, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			res, err := ParseResolution(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseResolution(%q) error = %v, wantErr = %v", tt.input, err, tt.wantErr)
			}
			if !tt.wantErr {
				if math.Abs(res.Dx-tt.wantDx) > 1e-4 || math.Abs(res.Dy-tt.wantDy) > 1e-4 {
					t.Errorf("ParseResolution(%q) = (%f, %f), want (%f, %f)", tt.input, res.Dx, res.Dy, tt.wantDx, tt.wantDy)
				}
				if res.CRS != tt.wantCRS {
					t.Errorf("ParseResolution(%q) CRS = %s, want %s", tt.input, res.CRS, tt.wantCRS)
				}
			}
		})
	}
}

func TestNewGridSpec(t *testing.T) {
	// Lake Victoria Basin: [29.0, -4.5, 36.0, 2.5] -> 7 degrees lon, 7 degrees lat
	lvBBox := models.BoundingBox{
		MinLon: 29.0,
		MinLat: -4.5,
		MaxLon: 36.0,
		MaxLat: 2.5,
	}

	// 1. At 0.1° resolution (GPM IMERG)
	spec01, err := NewGridSpec(lvBBox, ResGPM01)
	if err != nil {
		t.Fatalf("unexpected error for 0.1 deg: %v", err)
	}
	if spec01.Cols != 70 || spec01.Rows != 70 {
		t.Errorf("expected 70x70 cells at 0.1 deg, got %dx%d", spec01.Cols, spec01.Rows)
	}

	// 2. At 0.5° resolution (MERRA-2 Square)
	spec05, err := NewGridSpec(lvBBox, ResMERRA2Square)
	if err != nil {
		t.Fatalf("unexpected error for 0.5 deg: %v", err)
	}
	if spec05.Cols != 14 || spec05.Rows != 14 {
		t.Errorf("expected 14x14 cells at 0.5 deg, got %dx%d", spec05.Cols, spec05.Rows)
	}

	// 3. At true 9 km EASE-Grid 2.0 resolution (EPSG:6933, projected meters)
	spec9kmEASE2, err := NewGridSpec(lvBBox, ResSMAP9kmEASE2)
	if err != nil {
		t.Fatalf("unexpected error for 9 km EASE-Grid 2.0: %v", err)
	}
	if spec9kmEASE2.CRS != CRS_EPSG6933 {
		t.Errorf("expected CRS %s, got %s", CRS_EPSG6933, spec9kmEASE2.CRS)
	}
	// Lake Victoria projected span: 675.4 km lon / 9.024 km = 75 cols; 894.1 km lat / 9.024 km = 100 rows
	if spec9kmEASE2.Cols != 75 || spec9kmEASE2.Rows != 100 {
		t.Errorf("expected 75x100 cells at 9 km EASE-Grid 2.0, got %dx%d", spec9kmEASE2.Cols, spec9kmEASE2.Rows)
	}

	// 4. At unprojected approximate geographic 9 km resolution (EPSG:4326)
	spec9kmApprox, err := NewGridSpec(lvBBox, ResSMAP9kmApproxGeog)
	if err != nil {
		t.Fatalf("unexpected error for 9 km approx: %v", err)
	}
	// 7 deg snapped outward to global degree intervals yields 88 cols x 87 rows
	if spec9kmApprox.Cols != 88 || spec9kmApprox.Rows != 87 {
		t.Errorf("expected 88x87 cells at 9 km approx, got %dx%d", spec9kmApprox.Cols, spec9kmApprox.Rows)
	}
}

func TestEPSG6933ForwardInverseProjection(t *testing.T) {
	testPoints := []Point{
		{Lon: 0.0, Lat: 0.0},
		{Lon: 32.5, Lat: -1.0}, // Lake Victoria
		{Lon: 45.0, Lat: 10.0}, // Horn of Africa
		{Lon: 20.0, Lat: -2.0}, // Congo Basin
		{Lon: 0.0, Lat: 15.0},  // Sahel Belt
		{Lon: -120.0, Lat: 45.0},
		{Lon: 140.0, Lat: -30.0},
		{Lon: -179.9, Lat: -85.0},
		{Lon: 179.9, Lat: 85.0},
	}

	for _, pt := range testPoints {
		x, y, err := ForwardEPSG6933(pt)
		if err != nil {
			t.Fatalf("ForwardEPSG6933(%+v) failed: %v", pt, err)
		}

		roundtripPt, err := InverseEPSG6933(x, y)
		if err != nil {
			t.Fatalf("InverseEPSG6933(%f, %f) failed: %v", x, y, err)
		}

		diffLon := math.Abs(roundtripPt.Lon - pt.Lon)
		diffLat := math.Abs(roundtripPt.Lat - pt.Lat)

		if diffLon > 1e-10 || diffLat > 1e-10 {
			t.Errorf("EPSG:6933 roundtrip precision lost for %+v: got %+v (diffLon=%.2e, diffLat=%.2e)",
				pt, roundtripPt, diffLon, diffLat)
		}
	}
}

func TestEPSG6933GridSpecCoordTransformations(t *testing.T) {
	bbox := models.BoundingBox{
		MinLon: 29.0,
		MinLat: -4.5,
		MaxLon: 36.0,
		MaxLat: 2.5,
	}
	spec, err := NewGridSpec(bbox, ResSMAP9kmEASE2)
	if err != nil {
		t.Fatalf("failed to create EPSG:6933 grid spec: %v", err)
	}

	// Verify invertibility of CellCenter and CoordToCell
	for r := 0; r < spec.Rows; r++ {
		for c := 0; c < spec.Cols; c++ {
			pt := spec.CellCenter(c, r)
			gotC, gotR, ok := spec.CoordToCell(pt)
			if !ok {
				t.Fatalf("CoordToCell failed for cell (%d, %d) at center %+v", c, r, pt)
			}
			if gotC != c || gotR != r {
				t.Errorf("invertibility mismatch: expected (%d, %d), got (%d, %d)", c, r, gotC, gotR)
			}
		}
	}
}

func TestGridCoordinateTransformations(t *testing.T) {
	bbox := models.BoundingBox{
		MinLon: 10.0,
		MinLat: -10.0,
		MaxLon: 20.0,
		MaxLat: 0.0,
	}
	spec, err := NewGridSpec(bbox, GridResolution{Dx: 1.0, Dy: 1.0})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Top-left cell: (0, 0)
	centerTL := spec.CellCenter(0, 0)
	// Lon: 10 + 0.5 = 10.5; Lat: 0.0 - 0.5 = -0.5
	if math.Abs(centerTL.Lon-10.5) > 1e-9 || math.Abs(centerTL.Lat-(-0.5)) > 1e-9 {
		t.Errorf("expected top-left cell center (10.5, -0.5), got (%f, %f)", centerTL.Lon, centerTL.Lat)
	}

	// Invertibility: CoordToCell(CellCenter) must equal (c, r)
	for r := 0; r < spec.Rows; r++ {
		for c := 0; c < spec.Cols; c++ {
			pt := spec.CellCenter(c, r)
			gotC, gotR, ok := spec.CoordToCell(pt)
			if !ok {
				t.Fatalf("CoordToCell(%v) returned ok=false", pt)
			}
			if gotC != c || gotR != r {
				t.Errorf("cell center (%d, %d) converted to (%d, %d)", c, r, gotC, gotR)
			}
		}
	}

	// Out of bounds check
	_, _, ok := spec.CoordToCell(Point{Lon: 5.0, Lat: 5.0})
	if ok {
		t.Errorf("expected out of bounds for point (5, 5), got ok=true")
	}
}

func TestSpatialGridGetSetAndValid(t *testing.T) {
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 3, MaxLat: 3},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 3,
		Rows: 3,
	}

	grid := NewSpatialGrid(spec, -9999.0)
	if grid.ValidCount() != 0 {
		t.Errorf("expected 0 valid cells initially, got %d", grid.ValidCount())
	}

	grid.Set(1, 1, 42.5)
	if grid.Get(1, 1) != 42.5 {
		t.Errorf("expected value 42.5, got %f", grid.Get(1, 1))
	}
	if grid.ValidCount() != 1 {
		t.Errorf("expected 1 valid cell, got %d", grid.ValidCount())
	}

	// Check NaN and Inf
	grid.Set(0, 0, math.NaN())
	grid.Set(2, 2, math.Inf(1))
	if grid.IsValid(grid.Get(0, 0)) {
		t.Errorf("NaN should not be valid")
	}
	if grid.IsValid(grid.Get(2, 2)) {
		t.Errorf("Inf should not be valid")
	}

	// Out of bounds Get returns NoDataValue
	if grid.Get(5, 5) != -9999.0 {
		t.Errorf("expected NoDataValue for out of bounds Get")
	}
}

func TestClipByBoundingBox(t *testing.T) {
	// Source grid 10x10 covering [0, 0, 10, 10]
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 10, MaxLat: 10},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 10,
		Rows: 10,
	}
	grid := NewSpatialGrid(spec, 0.0)

	// Fill cell values with unique value: row * 10 + col
	for r := 0; r < 10; r++ {
		for c := 0; c < 10; c++ {
			grid.Set(c, r, float64(r*10+c))
		}
	}

	// Clip to [2.0, 3.0, 6.0, 7.0]
	// Lon: 2.0 to 6.0 -> 4 cols (c = 2, 3, 4, 5)
	// Lat: 3.0 to 7.0 -> in North-to-South row ordering (MaxLat=10):
	// Row 0 is lat 9-10, Row 3 is lat 6-7, Row 6 is lat 3-4 -> 4 rows (r = 3, 4, 5, 6)
	clipBox := models.BoundingBox{MinLon: 2.0, MinLat: 3.0, MaxLon: 6.0, MaxLat: 7.0}
	subGrid, err := grid.ClipByBoundingBox(clipBox)
	if err != nil {
		t.Fatalf("ClipByBoundingBox failed: %v", err)
	}

	if subGrid.Spec.Cols != 4 || subGrid.Spec.Rows != 4 {
		t.Errorf("expected subgrid 4x4, got %dx%d", subGrid.Spec.Cols, subGrid.Spec.Rows)
	}

	// Verify top-left cell of subgrid corresponds to source (col=2, row=3): value = 3*10 + 2 = 32
	if subGrid.Get(0, 0) != 32.0 {
		t.Errorf("expected subgrid (0,0) = 32.0, got %f", subGrid.Get(0, 0))
	}
	// Verify bottom-right cell: source (col=5, row=6): value = 6*10 + 5 = 65
	if subGrid.Get(3, 3) != 65.0 {
		t.Errorf("expected subgrid (3,3) = 65.0, got %f", subGrid.Get(3, 3))
	}

	// Disjoint clipping
	disjointBox := models.BoundingBox{MinLon: 20.0, MinLat: 20.0, MaxLon: 30.0, MaxLat: 30.0}
	_, err = grid.ClipByBoundingBox(disjointBox)
	if err == nil {
		t.Errorf("expected error for disjoint bbox clip, got nil")
	}
}

func TestClipByPolygonAndMask(t *testing.T) {
	// Source grid 10x10 covering [0, 0, 10, 10]
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 10, MaxLat: 10},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 10,
		Rows: 10,
	}
	grid := NewSpatialGrid(spec, 100.0)

	// Diamond polygon inside [2, 2] to [8, 8]
	poly, err := NewPolygon(Ring{
		{Lon: 5, Lat: 2},
		{Lon: 8, Lat: 5},
		{Lon: 5, Lat: 8},
		{Lon: 2, Lat: 5},
		{Lon: 5, Lat: 2},
	})
	if err != nil {
		t.Fatalf("failed to create polygon: %v", err)
	}

	maskedGrid, err := grid.ClipByPolygon(poly)
	if err != nil {
		t.Fatalf("ClipByPolygon failed: %v", err)
	}

	// Center cell should be preserved
	centerVal, ok := maskedGrid.GetByCoord(Point{Lon: 5, Lat: 5})
	if !ok || centerVal != 100.0 {
		t.Errorf("expected center point to be 100.0, got %f (ok=%v)", centerVal, ok)
	}

	// Corner of the subgrid bbox (e.g. Lon 2.2, Lat 7.8) is outside diamond -> should be NoData
	cornerVal, ok := maskedGrid.GetByCoord(Point{Lon: 2.2, Lat: 7.8})
	if ok && maskedGrid.IsValid(cornerVal) {
		t.Errorf("expected corner of subgrid outside diamond to be NoData, got %f", cornerVal)
	}

	// SpatialMask precomputation check
	mask := ComputeSpatialMask(maskedGrid.Spec, poly)
	if len(mask.ValidIndices) == 0 {
		t.Errorf("expected valid indices in precomputed mask")
	}
	if len(mask.ValidIndices) >= mask.Spec.Rows*mask.Spec.Cols {
		t.Errorf("diamond mask should not contain all subgrid cells")
	}
}
