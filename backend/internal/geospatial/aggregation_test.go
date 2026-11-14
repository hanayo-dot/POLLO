package geospatial

import (
	"math"
	"testing"

	"github.com/pollo/backend/internal/models"
)

func TestUniformGridAggregation(t *testing.T) {
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 4, MaxLat: 4},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 4,
		Rows: 4,
	}
	grid := NewSpatialGrid(spec, -9999.0)
	grid.Fill(10.0)

	mean, err := SpatialMean(grid, false)
	if err != nil {
		t.Fatalf("unexpected error for mean: %v", err)
	}
	if math.Abs(mean-10.0) > 1e-9 {
		t.Errorf("expected mean 10.0, got %f", mean)
	}

	median, err := SpatialMedian(grid, false)
	if err != nil {
		t.Fatalf("unexpected error for median: %v", err)
	}
	if math.Abs(median-10.0) > 1e-9 {
		t.Errorf("expected median 10.0, got %f", median)
	}

	variance, err := SpatialVariance(grid, true, false)
	if err != nil {
		t.Fatalf("unexpected error for variance: %v", err)
	}
	if math.Abs(variance-0.0) > 1e-9 {
		t.Errorf("expected variance 0.0 for uniform grid, got %f", variance)
	}
}

func TestKnownSequenceAggregation(t *testing.T) {
	// 1 row with 5 columns: values 1, 2, 3, 4, 5
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 5, MaxLat: 1},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 5,
		Rows: 1,
	}
	grid := NewSpatialGrid(spec, 0.0)
	for c := 0; c < 5; c++ {
		grid.Set(c, 0, float64(c+1))
	}

	// 1. Mean: (1+2+3+4+5)/5 = 3.0
	mean, err := SpatialMean(grid, false)
	if err != nil {
		t.Fatalf("mean failed: %v", err)
	}
	if math.Abs(mean-3.0) > 1e-9 {
		t.Errorf("expected mean 3.0, got %f", mean)
	}

	// 2. Median: 3.0
	median, err := SpatialMedian(grid, false)
	if err != nil {
		t.Fatalf("median failed: %v", err)
	}
	if math.Abs(median-3.0) > 1e-9 {
		t.Errorf("expected median 3.0, got %f", median)
	}

	// 3. Sample variance: sum((x - 3)^2) / 4 = (4 + 1 + 0 + 1 + 4) / 4 = 10 / 4 = 2.5
	sampleVar, err := SpatialVariance(grid, true, false)
	if err != nil {
		t.Fatalf("sample variance failed: %v", err)
	}
	if math.Abs(sampleVar-2.5) > 1e-9 {
		t.Errorf("expected sample variance 2.5, got %f", sampleVar)
	}

	// 4. Population variance: 10 / 5 = 2.0
	popVar, err := SpatialVariance(grid, false, false)
	if err != nil {
		t.Fatalf("population variance failed: %v", err)
	}
	if math.Abs(popVar-2.0) > 1e-9 {
		t.Errorf("expected population variance 2.0, got %f", popVar)
	}
}

func TestEvenCountMedian(t *testing.T) {
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 4, MaxLat: 1},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 4,
		Rows: 1,
	}
	grid := NewSpatialGrid(spec, 0.0)
	// values: 10, 20, 30, 40 -> median is (20+30)/2 = 25.0
	grid.Set(0, 0, 10.0)
	grid.Set(1, 0, 20.0)
	grid.Set(2, 0, 30.0)
	grid.Set(3, 0, 40.0)

	median, err := SpatialMedian(grid, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if math.Abs(median-25.0) > 1e-9 {
		t.Errorf("expected even-count median 25.0, got %f", median)
	}
}

func TestCosineLatitudeAreaWeighting(t *testing.T) {
	// Create a grid with 2 rows:
	// Row 0 center is at Lat 60°: cos(60°) = 0.5
	// Row 1 center is at Lat 0°: cos(0°) = 1.0
	// MaxLat = 90°, MinLat = -30°, ResY = 60°
	// Row 0: center Lat = 90 - 30 = 60° -> cos = 0.5
	// Row 1: center Lat = 30 - 30 = 0°  -> cos = 1.0
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: -30, MaxLon: 10, MaxLat: 90},
		ResX: 10.0,
		ResY: 60.0,
		Cols: 1,
		Rows: 2,
	}
	grid := NewSpatialGrid(spec, 0.0)
	grid.Set(0, 0, 10.0) // At 60° lat (w = 0.5)
	grid.Set(0, 1, 20.0) // At 0° lat (w = 1.0)

	// Unweighted mean: (10 + 20) / 2 = 15.0
	unwMean, err := SpatialMean(grid, false)
	if err != nil {
		t.Fatalf("unweighted mean failed: %v", err)
	}
	if math.Abs(unwMean-15.0) > 1e-9 {
		t.Errorf("expected unweighted mean 15.0, got %f", unwMean)
	}

	// Weighted mean: (10 * 0.5 + 20 * 1.0) / (0.5 + 1.0) = 25 / 1.5 = 16.666667
	wMean, err := SpatialMean(grid, true)
	if err != nil {
		t.Fatalf("weighted mean failed: %v", err)
	}
	expectedWMean := 25.0 / 1.5
	if math.Abs(wMean-expectedWMean) > 1e-6 {
		t.Errorf("expected weighted mean %f, got %f", expectedWMean, wMean)
	}

	// Weighted median
	wMed, err := SpatialMedian(grid, true)
	if err != nil {
		t.Fatalf("weighted median failed: %v", err)
	}
	// Total weight = 1.5, half weight = 0.75.
	// w(10) = 0.5 < 0.75. Next w(20) cumWeight = 1.5 > 0.75 -> 20.0
	if math.Abs(wMed-20.0) > 1e-6 {
		t.Errorf("expected weighted median 20.0, got %f", wMed)
	}
}

func TestNoDataAndNaNHandling(t *testing.T) {
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 2, MaxLat: 2},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 2,
		Rows: 2,
	}
	grid := NewSpatialGrid(spec, -9999.0) // NoDataValue = -9999.0

	// Set 2 valid cells and 2 invalid cells
	grid.Set(0, 0, 10.0)
	grid.Set(1, 0, 20.0)
	grid.Set(0, 1, math.NaN()) // Invalid
	grid.Set(1, 1, -9999.0)    // NoDataValue

	mean, err := SpatialMean(grid, false)
	if err != nil {
		t.Fatalf("mean failed: %v", err)
	}
	if math.Abs(mean-15.0) > 1e-9 {
		t.Errorf("expected mean 15.0 ignoring NaNs/NoData, got %f", mean)
	}

	median, err := SpatialMedian(grid, false)
	if err != nil {
		t.Fatalf("median failed: %v", err)
	}
	if math.Abs(median-15.0) > 1e-9 {
		t.Errorf("expected median 15.0, got %f", median)
	}

	// Sample variance of {10, 20} -> ((10-15)^2 + (20-15)^2) / 1 = 50.0
	variance, err := SpatialVariance(grid, true, false)
	if err != nil {
		t.Fatalf("variance failed: %v", err)
	}
	if math.Abs(variance-50.0) > 1e-9 {
		t.Errorf("expected variance 50.0, got %f", variance)
	}

	// All cells invalid -> expect error
	allInvalidGrid := NewSpatialGrid(spec, -9999.0)
	_, err = SpatialMean(allInvalidGrid, false)
	if err == nil {
		t.Errorf("expected error for all-NoData grid, got nil")
	}
	_, err = SpatialMedian(allInvalidGrid, false)
	if err == nil {
		t.Errorf("expected error for all-NoData grid, got nil")
	}
	_, err = SpatialVariance(allInvalidGrid, true, false)
	if err == nil {
		t.Errorf("expected error for all-NoData grid, got nil")
	}
}

func TestMaskedAggregation(t *testing.T) {
	// Grid 4x4 with values equal to row index (0, 1, 2, 3)
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 4, MaxLat: 4},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 4,
		Rows: 4,
	}
	grid := NewSpatialGrid(spec, 0.0)
	for r := 0; r < 4; r++ {
		for c := 0; c < 4; c++ {
			grid.Set(c, r, float64(r*10)) // Row 0 = 0, Row 1 = 10, Row 2 = 20, Row 3 = 30
		}
	}

	// Polygon covering only Rows 1 and 2 (Lat between 1.0 and 3.0, Lon between 1.0 and 3.0)
	// MaxLat = 4.0:
	// Row 0: lat 3 to 4
	// Row 1: lat 2 to 3
	// Row 2: lat 1 to 2
	// Row 3: lat 0 to 1
	poly, err := NewPolygon(Ring{
		{Lon: 1, Lat: 1},
		{Lon: 3, Lat: 1},
		{Lon: 3, Lat: 3},
		{Lon: 1, Lat: 3},
		{Lon: 1, Lat: 1},
	})
	if err != nil {
		t.Fatalf("polygon creation failed: %v", err)
	}

	mask := ComputeSpatialMask(grid.Spec, poly)
	// Cells inside mask will be in rows 1 and 2 (values 10.0 and 20.0)
	mean, err := AggregateMasked(grid, mask, AggMean, DefaultAggregationOptions())
	if err != nil {
		t.Fatalf("masked mean failed: %v", err)
	}
	if math.Abs(mean-15.0) > 1e-9 {
		t.Errorf("expected masked mean 15.0, got %f", mean)
	}
}

func TestEmptyMaskSemantics(t *testing.T) {
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 4, MaxLat: 4},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 4,
		Rows: 4,
	}
	grid := NewSpatialGrid(spec, 0.0)
	grid.Fill(50.0)
	// Change one cell to 100.0
	grid.Set(0, 0, 100.0)

	// 1. Nil mask: must aggregate the entire grid
	// 15 cells of 50.0 + 1 cell of 100.0 = 850.0 / 16 = 53.125
	meanNil, err := AggregateMasked(grid, nil, AggMean, DefaultAggregationOptions())
	if err != nil {
		t.Fatalf("nil mask should aggregate entire grid, got err: %v", err)
	}
	if math.Abs(meanNil-53.125) > 1e-9 {
		t.Errorf("expected nil mask mean 53.125, got %f", meanNil)
	}

	// 2. Non-empty mask selecting only cell (0, 0)
	nonEmptyMask := &SpatialMask{
		Spec:         spec,
		Mask:         make([]bool, 16),
		ValidIndices: []int{0},
	}
	nonEmptyMask.Mask[0] = true

	meanNonEmpty, err := AggregateMasked(grid, nonEmptyMask, AggMean, DefaultAggregationOptions())
	if err != nil {
		t.Fatalf("non-empty mask failed: %v", err)
	}
	if math.Abs(meanNonEmpty-100.0) > 1e-9 {
		t.Errorf("expected non-empty mask mean 100.0, got %f", meanNonEmpty)
	}

	// 3. Empty non-nil mask: must return error and NaN, NEVER fall back to full grid!
	emptyMask := &SpatialMask{
		Spec:         spec,
		Mask:         make([]bool, 16),
		ValidIndices: []int{},
	}

	// Mean with empty mask
	meanEmpty, err := AggregateMasked(grid, emptyMask, AggMean, DefaultAggregationOptions())
	if err == nil {
		t.Errorf("expected error for empty mask mean, got nil (result=%f)", meanEmpty)
	}
	if !math.IsNaN(meanEmpty) {
		t.Errorf("expected NaN for empty mask mean, got %f", meanEmpty)
	}

	// Median with empty mask
	medEmpty, err := AggregateMasked(grid, emptyMask, AggMedian, DefaultAggregationOptions())
	if err == nil {
		t.Errorf("expected error for empty mask median, got nil (result=%f)", medEmpty)
	}
	if !math.IsNaN(medEmpty) {
		t.Errorf("expected NaN for empty mask median, got %f", medEmpty)
	}

	// Variance with empty mask
	varEmpty, err := AggregateMasked(grid, emptyMask, AggVariance, DefaultAggregationOptions())
	if err == nil {
		t.Errorf("expected error for empty mask variance, got nil (result=%f)", varEmpty)
	}
	if !math.IsNaN(varEmpty) {
		t.Errorf("expected NaN for empty mask variance, got %f", varEmpty)
	}
}

func TestTinyPolygonNoCells(t *testing.T) {
	// Grid with 1° cells: cell centers at 0.5, 1.5, etc.
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 10, MaxLat: 10},
		ResX: 1.0,
		ResY: 1.0,
		Cols: 10,
		Rows: 10,
	}
	grid := NewSpatialGrid(spec, 0.0)
	grid.Fill(42.0)

	// Tiny polygon inside [0.1, 0.1] to [0.2, 0.2]: contains zero grid cell centers
	tinyPoly, err := NewPolygon(Ring{
		{Lon: 0.1, Lat: 0.1},
		{Lon: 0.2, Lat: 0.1},
		{Lon: 0.2, Lat: 0.2},
		{Lon: 0.1, Lat: 0.2},
		{Lon: 0.1, Lat: 0.1},
	})
	if err != nil {
		t.Fatalf("failed to create tiny polygon: %v", err)
	}

	mask := ComputeSpatialMask(spec, tinyPoly)
	if len(mask.ValidIndices) != 0 {
		t.Fatalf("expected 0 valid indices for tiny polygon, got %d", len(mask.ValidIndices))
	}

	// Assert that AggregateMasked returns an error and NaN, NOT 42.0!
	val, err := AggregateMasked(grid, mask, AggMean, DefaultAggregationOptions())
	if err == nil {
		t.Errorf("expected error for tiny polygon with 0 cells, got nil (val=%f)", val)
	}
	if !math.IsNaN(val) {
		t.Errorf("expected NaN for tiny polygon with 0 cells, got %f", val)
	}
}
