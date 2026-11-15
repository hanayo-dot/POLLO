package geospatial

import (
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/pollo/backend/internal/models"
)

func makeTestTemporalGrids(startYear, endYear int, res GridResolution, baseBBox models.BoundingBox) []*TemporalGrid {
	spec, _ := NewGridSpec(baseBBox, res)
	totalMonths := (endYear - startYear + 1) * 12
	grids := make([]*TemporalGrid, totalMonths)

	idx := 0
	for y := startYear; y <= endYear; y++ {
		for m := 1; m <= 12; m++ {
			dateStr := fmt.Sprintf("%04d-%02d", y, m)
			t := time.Date(y, time.Month(m), 15, 12, 0, 0, 0, time.UTC)

			grid := NewSpatialGrid(spec, 0.0)
			// Fill with synthetic spatial field: base value + seasonal cycle + latitude gradient
			season := 10.0 * math.Sin(2.0*math.Pi*float64(m-1)/12.0)
			for r := 0; r < spec.Rows; r++ {
				for c := 0; c < spec.Cols; c++ {
					center := spec.CellCenter(c, r)
					val := 20.0 + season + (center.Lon*0.5 - center.Lat*0.2)
					grid.Set(c, r, val)
				}
			}

			grids[idx] = &TemporalGrid{
				Date:      dateStr,
				Timestamp: t.Unix(),
				Grid:      grid,
			}
			idx++
		}
	}

	return grids
}

func TestExtractTimeSeriesSingleRegion(t *testing.T) {
	// Domain [0, 0, 10, 10]
	domainBBox := models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 10, MaxLat: 10}
	grids := makeTestTemporalGrids(2020, 2021, ResMERRA2Square, domainBBox) // 24 months

	// Target polygon: [2, 2] to [6, 6]
	poly, err := NewPolygon(Ring{
		{Lon: 2, Lat: 2},
		{Lon: 6, Lat: 2},
		{Lon: 6, Lat: 6},
		{Lon: 2, Lat: 6},
		{Lon: 2, Lat: 2},
	})
	if err != nil {
		t.Fatalf("failed to create polygon: %v", err)
	}

	series, err := ExtractTimeSeries(grids, poly, AggMean, DefaultAggregationOptions())
	if err != nil {
		t.Fatalf("ExtractTimeSeries failed: %v", err)
	}

	if len(series) != 24 {
		t.Fatalf("expected 24 points, got %d", len(series))
	}

	// Verify dates
	if series[0].Date != "2020-01" {
		t.Errorf("expected first date 2020-01, got %s", series[0].Date)
	}
	if series[23].Date != "2021-12" {
		t.Errorf("expected last date 2021-12, got %s", series[23].Date)
	}

	// Month 1 (Jan, m=1) season = sin(0) = 0
	// Month 4 (Apr, m=4) season = sin(pi/2) = 1 -> value should be higher
	if series[3].Value <= series[0].Value {
		t.Errorf("expected April value (%f) > January value (%f)", series[3].Value, series[0].Value)
	}
}

func TestExtractMultiRegionTimeSeries(t *testing.T) {
	domainBBox := models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 20, MaxLat: 20}
	grids := makeTestTemporalGrids(2020, 2020, ResMERRA2Square, domainBBox) // 12 months

	// Region 1: Western sector [2, 2] to [6, 6]
	poly1, _ := NewPolygon(Ring{
		{Lon: 2, Lat: 2},
		{Lon: 6, Lat: 2},
		{Lon: 6, Lat: 6},
		{Lon: 2, Lat: 6},
	})

	// Region 2: Eastern sector [12, 12] to [16, 16]
	poly2, _ := NewPolygon(Ring{
		{Lon: 12, Lat: 12},
		{Lon: 16, Lat: 12},
		{Lon: 16, Lat: 16},
		{Lon: 12, Lat: 16},
	})

	targets := []RegionTarget{
		{ID: "west_zone", Polygon: poly1},
		{ID: "east_zone", Polygon: poly2},
	}

	results, err := ExtractMultiRegionTimeSeries(grids, targets, AggMean, DefaultAggregationOptions())
	if err != nil {
		t.Fatalf("ExtractMultiRegionTimeSeries failed: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 regions in results, got %d", len(results))
	}

	westSeries, ok := results["west_zone"]
	if !ok || len(westSeries) != 12 {
		t.Errorf("invalid west_zone results: ok=%v, len=%d", ok, len(westSeries))
	}

	eastSeries, ok := results["east_zone"]
	if !ok || len(eastSeries) != 12 {
		t.Errorf("invalid east_zone results: ok=%v, len=%d", ok, len(eastSeries))
	}

	// Compare with stream multi-region
	provider := NewSliceGridProvider(grids)
	streamResults, err := ExtractStreamMultiRegionTimeSeries(provider, targets, AggMean, DefaultAggregationOptions())
	if err != nil {
		t.Fatalf("ExtractStreamMultiRegionTimeSeries failed: %v", err)
	}

	for _, id := range []string{"west_zone", "east_zone"} {
		s1 := results[id]
		s2 := streamResults[id]
		if len(s1) != len(s2) {
			t.Fatalf("mismatched series length for %s", id)
		}
		for i := range s1 {
			if s1[i].Date != s2[i].Date || math.Abs(s1[i].Value-s2[i].Value) > 1e-6 {
				t.Errorf("stream vs slice mismatch at step %d for %s: %f vs %f", i, id, s1[i].Value, s2[i].Value)
			}
		}
	}
}

func TestExtractTimeSeriesDisjointRegionError(t *testing.T) {
	domainBBox := models.BoundingBox{MinLon: 0, MinLat: 0, MaxLon: 10, MaxLat: 10}
	grids := makeTestTemporalGrids(2020, 2020, ResMERRA2Square, domainBBox)

	// Region outside domain: [30, 30] to [40, 40]
	outsidePoly, _ := NewPolygon(Ring{
		{Lon: 30, Lat: 30},
		{Lon: 40, Lat: 30},
		{Lon: 40, Lat: 40},
		{Lon: 30, Lat: 40},
	})

	_, err := ExtractTimeSeries(grids, outsidePoly, AggMean, DefaultAggregationOptions())
	if err == nil {
		t.Errorf("expected error for disjoint region extraction, got nil")
	}
}
