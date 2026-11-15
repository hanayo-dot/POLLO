package geospatial

import (
	"math"
	"testing"

	"github.com/pollo/backend/internal/models"
)

func BenchmarkBoundingBoxIntersection(b *testing.B) {
	b1 := models.BoundingBox{MinLon: 29.0, MinLat: -4.5, MaxLon: 36.0, MaxLat: 2.5}
	b2 := models.BoundingBox{MinLon: 31.0, MinLat: -2.0, MaxLon: 38.0, MaxLat: 5.0}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = BoundingBoxIntersection(b1, b2)
	}
}

func BenchmarkPointInPolygon(b *testing.B) {
	// Lake Victoria Basin 10-vertex polygon
	ring := Ring{
		{Lon: 31.5, Lat: 2.0},
		{Lon: 34.5, Lat: 1.5},
		{Lon: 35.5, Lat: -0.5},
		{Lon: 35.0, Lat: -2.5},
		{Lon: 34.0, Lat: -4.0},
		{Lon: 31.5, Lat: -4.0},
		{Lon: 30.0, Lat: -2.5},
		{Lon: 29.5, Lat: -0.5},
		{Lon: 30.5, Lat: 1.5},
		{Lon: 31.5, Lat: 2.0},
	}
	poly, err := NewPolygon(ring)
	if err != nil {
		b.Fatalf("failed to create polygon: %v", err)
	}

	ptInside := Point{Lon: 32.5, Lat: -1.0}
	ptOutside := Point{Lon: 20.0, Lat: 10.0} // Outside bbox

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = poly.Contains(ptInside)
		_ = poly.Contains(ptOutside)
	}
}

func BenchmarkSpatialAggregationMean_01Deg(b *testing.B) {
	// 70x70 = 4,900 cells (0.1° over 7°x7° domain)
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 29.0, MinLat: -4.5, MaxLon: 36.0, MaxLat: 2.5},
		ResX: 0.1,
		ResY: 0.1,
		Cols: 70,
		Rows: 70,
	}
	grid := NewSpatialGrid(spec, 0.0)
	for i := range grid.Data {
		grid.Data[i] = 120.0 + math.Sin(float64(i)*0.1)*20.0
	}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = SpatialMean(grid, true)
	}
}

func BenchmarkSpatialAggregationMedian_01Deg(b *testing.B) {
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 29.0, MinLat: -4.5, MaxLon: 36.0, MaxLat: 2.5},
		ResX: 0.1,
		ResY: 0.1,
		Cols: 70,
		Rows: 70,
	}
	grid := NewSpatialGrid(spec, 0.0)
	for i := range grid.Data {
		grid.Data[i] = 120.0 + math.Sin(float64(i)*0.1)*20.0
	}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = SpatialMedian(grid, false)
	}
}

func BenchmarkSpatialAggregationVariance_01Deg(b *testing.B) {
	spec := GridSpec{
		BBox: models.BoundingBox{MinLon: 29.0, MinLat: -4.5, MaxLon: 36.0, MaxLat: 2.5},
		ResX: 0.1,
		ResY: 0.1,
		Cols: 70,
		Rows: 70,
	}
	grid := NewSpatialGrid(spec, 0.0)
	for i := range grid.Data {
		grid.Data[i] = 120.0 + math.Sin(float64(i)*0.1)*20.0
	}

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, _ = SpatialVariance(grid, true, true)
	}
}

func Benchmark25YearMonthlyExtraction_05Deg(b *testing.B) {
	domainBBox := models.BoundingBox{MinLon: 29.0, MinLat: -4.5, MaxLon: 36.0, MaxLat: 2.5}
	// 25 years = 300 months (2000-2024)
	grids := makeTestTemporalGrids(2000, 2024, ResMERRA2Square, domainBBox)

	poly, _ := NewPolygon(Ring{
		{Lon: 31.5, Lat: 2.0},
		{Lon: 34.5, Lat: 1.5},
		{Lon: 35.5, Lat: -0.5},
		{Lon: 35.0, Lat: -2.5},
		{Lon: 34.0, Lat: -4.0},
		{Lon: 31.5, Lat: -4.0},
		{Lon: 30.0, Lat: -2.5},
		{Lon: 29.5, Lat: -0.5},
		{Lon: 30.5, Lat: 1.5},
		{Lon: 31.5, Lat: 2.0},
	})

	opts := DefaultAggregationOptions()
	opts.Weighted = true

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := ExtractTimeSeries(grids, poly, AggMean, opts)
		if err != nil {
			b.Fatalf("extraction failed: %v", err)
		}
	}
}

func Benchmark25YearMonthlyExtraction_01Deg(b *testing.B) {
	domainBBox := models.BoundingBox{MinLon: 29.0, MinLat: -4.5, MaxLon: 36.0, MaxLat: 2.5}
	// 300 months at 0.1° (~1.47M cell evaluations)
	grids := makeTestTemporalGrids(2000, 2024, ResGPM01, domainBBox)

	poly, _ := NewPolygon(Ring{
		{Lon: 31.5, Lat: 2.0},
		{Lon: 34.5, Lat: 1.5},
		{Lon: 35.5, Lat: -0.5},
		{Lon: 35.0, Lat: -2.5},
		{Lon: 34.0, Lat: -4.0},
		{Lon: 31.5, Lat: -4.0},
		{Lon: 30.0, Lat: -2.5},
		{Lon: 29.5, Lat: -0.5},
		{Lon: 30.5, Lat: 1.5},
		{Lon: 31.5, Lat: 2.0},
	})

	opts := DefaultAggregationOptions()
	opts.Weighted = true

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := ExtractTimeSeries(grids, poly, AggMean, opts)
		if err != nil {
			b.Fatalf("extraction failed: %v", err)
		}
	}
}

func Benchmark25YearMonthlyExtraction_9km(b *testing.B) {
	domainBBox := models.BoundingBox{MinLon: 29.0, MinLat: -4.5, MaxLon: 36.0, MaxLat: 2.5}
	// 300 months at 9 km (~2.27M cell evaluations)
	grids := makeTestTemporalGrids(2000, 2024, ResSMAP9km, domainBBox)

	poly, _ := NewPolygon(Ring{
		{Lon: 31.5, Lat: 2.0},
		{Lon: 34.5, Lat: 1.5},
		{Lon: 35.5, Lat: -0.5},
		{Lon: 35.0, Lat: -2.5},
		{Lon: 34.0, Lat: -4.0},
		{Lon: 31.5, Lat: -4.0},
		{Lon: 30.0, Lat: -2.5},
		{Lon: 29.5, Lat: -0.5},
		{Lon: 30.5, Lat: 1.5},
		{Lon: 31.5, Lat: 2.0},
	})

	opts := DefaultAggregationOptions()
	opts.Weighted = true

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := ExtractTimeSeries(grids, poly, AggMean, opts)
		if err != nil {
			b.Fatalf("extraction failed: %v", err)
		}
	}
}
