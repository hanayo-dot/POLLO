package data

import (
	"fmt"
	"math"
	"testing"

	"github.com/pollo/backend/internal/data/catalog"
	"github.com/pollo/backend/internal/geospatial"
)

func TestCatalogRegionPolygons(t *testing.T) {
	regions := AvailableRegions()
	if len(regions) != 4 {
		t.Fatalf("expected 4 catalog regions, got %d", len(regions))
	}

	for _, r := range regions {
		poly, exists := catalog.GetRegionPolygon(r.ID)
		if !exists {
			t.Errorf("region %s missing from polygon catalog", r.ID)
			continue
		}

		// Verify polygon is well formed and has non-zero area
		polyBBox := poly.BoundingBox()
		if err := geospatial.ValidateBoundingBox(polyBBox); err != nil {
			t.Errorf("region %s polygon bbox invalid: %v", r.ID, err)
		}

		// Verify polygon envelope is contained within or equals region bbox
		if polyBBox.MinLon < r.BBox.MinLon-1e-6 || polyBBox.MaxLon > r.BBox.MaxLon+1e-6 ||
			polyBBox.MinLat < r.BBox.MinLat-1e-6 || polyBBox.MaxLat > r.BBox.MaxLat+1e-6 {
			t.Errorf("region %s polygon bbox %v exceeds region bbox %v", r.ID, polyBBox, r.BBox)
		}
	}
}

func TestGenerateBenchmarkGrid(t *testing.T) {
	lvBBox := AvailableRegions()[0].BBox

	// 1. GPM_PRECIP at 0.1° resolution
	gridGPM, err := GenerateBenchmarkGrid("GPM_PRECIP", 2020, 4, lvBBox, geospatial.ResGPM01)
	if err != nil {
		t.Fatalf("GenerateBenchmarkGrid GPM failed: %v", err)
	}
	if gridGPM.Spec.Cols != 70 || gridGPM.Spec.Rows != 70 {
		t.Errorf("expected 70x70 grid, got %dx%d", gridGPM.Spec.Cols, gridGPM.Spec.Rows)
	}
	if gridGPM.ValidCount() != 70*70 {
		t.Errorf("expected all cells valid, got %d", gridGPM.ValidCount())
	}

	// 2. MERRA2_T2M at 0.5° resolution
	gridT2M, err := GenerateBenchmarkGrid("MERRA2_T2M", 2020, 7, lvBBox, geospatial.ResMERRA2Square)
	if err != nil {
		t.Fatalf("GenerateBenchmarkGrid T2M failed: %v", err)
	}
	if gridT2M.Spec.Cols != 14 || gridT2M.Spec.Rows != 14 {
		t.Errorf("expected 14x14 grid, got %dx%d", gridT2M.Spec.Cols, gridT2M.Spec.Rows)
	}

	// Check physical realism of temperature (~15 to ~35 °C)
	for _, v := range gridT2M.Data {
		if v < 10.0 || v > 40.0 {
			t.Errorf("unrealistic temperature value: %f", v)
			break
		}
	}
}

func TestExtractRegionSpatialTimeSeries(t *testing.T) {
	// Extract 25 years (300 months) for Lake Victoria Basin
	series, err := ExtractRegionSpatialTimeSeries("lake_victoria_basin", "MERRA2_T2M", geospatial.AggMean, true)
	if err != nil {
		t.Fatalf("ExtractRegionSpatialTimeSeries failed: %v", err)
	}

	if len(series) != 300 {
		t.Fatalf("expected 300 monthly points for 2000-2024, got %d", len(series))
	}

	if series[0].Date != "2000-01" {
		t.Errorf("expected first date 2000-01, got %s", series[0].Date)
	}
	if series[299].Date != "2024-12" {
		t.Errorf("expected last date 2024-12, got %s", series[299].Date)
	}

	for _, p := range series {
		if math.IsNaN(p.Value) || math.IsInf(p.Value, 0) {
			t.Fatalf("extracted NaN/Inf at date %s", p.Date)
		}
	}
}

func TestExtractMultiRegionSpatialTimeSeries(t *testing.T) {
	regions := []string{"lake_victoria_basin", "horn_of_africa"}
	results, err := ExtractMultiRegionSpatialTimeSeries(regions, "MERRA2_T2M", geospatial.AggMean, false)
	if err != nil {
		t.Fatalf("ExtractMultiRegionSpatialTimeSeries failed: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 region results, got %d", len(results))
	}

	for _, id := range regions {
		s, ok := results[id]
		if !ok || len(s) != 300 {
			t.Errorf("region %s missing or incomplete series (len=%d)", id, len(s))
		}
	}
}

func TestSingleVsMultiRegionConsistency(t *testing.T) {
	// Regression test for Finding 2: Single-region and multi-region extraction
	// of the exact same geographical region must produce identical results.
	targetRegion := "lake_victoria_basin"
	allRegions := []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"}
	testVariables := []string{"MERRA2_T2M", "GPM_PRECIP"}

	for _, vID := range testVariables {
		for _, weighted := range []bool{false, true} {
			mode := "unweighted"
			if weighted {
				mode = "weighted"
			}
			testName := fmt.Sprintf("%s_%s", vID, mode)
			t.Run(testName, func(t *testing.T) {
				// 1. Single region extraction
				singleSeries, err := ExtractRegionSpatialTimeSeries(targetRegion, vID, geospatial.AggMean, weighted)
				if err != nil {
					t.Fatalf("single-region extraction failed for %s: %v", vID, err)
				}

				// 2. Multi-region extraction including the target region and wide continental union bbox
				multiResults, err := ExtractMultiRegionSpatialTimeSeries(allRegions, vID, geospatial.AggMean, weighted)
				if err != nil {
					t.Fatalf("multi-region extraction failed for %s: %v", vID, err)
				}

				multiSeries, ok := multiResults[targetRegion]
				if !ok {
					t.Fatalf("multi-region results missing target region %s", targetRegion)
				}

				if len(singleSeries) != len(multiSeries) {
					t.Fatalf("mismatched series length: single=%d, multi=%d", len(singleSeries), len(multiSeries))
				}

				// 3. Verify that every single observation across the 25-year time series matches
				for i := range singleSeries {
					diff := math.Abs(singleSeries[i].Value - multiSeries[i].Value)
					const tolerance = 1e-3 // Machine precision for 3-decimal rounded TimeSeriesPoint values
					if diff > tolerance {
						t.Errorf("[%s] step %d (%s) discrepancy between single (%f) and multi (%f): diff=%f",
							testName, i, singleSeries[i].Date, singleSeries[i].Value, multiSeries[i].Value, diff)
					}
				}

				// Specifically check January 2000 (first step)
				t.Logf("[%s] Jan 2000: single=%.3f, multi=%.3f (consistent: %v)",
					testName, singleSeries[0].Value, multiSeries[0].Value, singleSeries[0].Value == multiSeries[0].Value)
			})
		}
	}
}

func TestGenerateBenchmarkTimeSeriesBackwardCompatibility(t *testing.T) {
	// Verify that existing 1D function works seamlessly without regression
	points, err := GenerateBenchmarkTimeSeries("lake_victoria_basin", "GPM_PRECIP")
	if err != nil {
		t.Fatalf("GenerateBenchmarkTimeSeries failed: %v", err)
	}
	if len(points) != 300 {
		t.Errorf("expected 300 points, got %d", len(points))
	}
}
