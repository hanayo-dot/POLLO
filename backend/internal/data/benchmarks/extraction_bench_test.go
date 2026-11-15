package benchmarks

import (
	"testing"

	"github.com/pollo/backend/internal/data"
	"github.com/pollo/backend/internal/geospatial"
)

func Benchmark25YearExtractionPipeline_LakeVictoria(b *testing.B) {
	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		series, err := data.ExtractRegionSpatialTimeSeries("lake_victoria_basin", "GPM_PRECIP", geospatial.AggMean, true)
		if err != nil {
			b.Fatalf("extraction failed: %v", err)
		}
		if len(series) != 300 {
			b.Fatalf("expected 300 points, got %d", len(series))
		}
	}
}

func BenchmarkMultiRegion25YearExtraction(b *testing.B) {
	regionIDs := []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		results, err := data.ExtractMultiRegionSpatialTimeSeries(regionIDs, "MERRA2_T2M", geospatial.AggMean, false)
		if err != nil {
			b.Fatalf("multi-region extraction failed: %v", err)
		}
		if len(results) != 4 {
			b.Fatalf("expected 4 regions, got %d", len(results))
		}
	}
}
