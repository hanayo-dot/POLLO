package trendx

import (
	"math"
	"testing"

	"github.com/pollo/backend/internal/models"
)

func TestMannKendallIncreasingTrend(t *testing.T) {
	// Monotonically increasing time series: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
	data := []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	res, err := MannKendall(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// n*(n-1)/2 = 10*9/2 = 45
	if res.S != 45.0 {
		t.Errorf("expected S=45, got %f", res.S)
	}
	if res.Z <= 0 {
		t.Errorf("expected positive Z, got %f", res.Z)
	}
	if res.PValue > 0.001 {
		t.Errorf("expected very small p-value, got %f", res.PValue)
	}
	if res.Significance != "significant" {
		t.Errorf("expected significant trend, got %s", res.Significance)
	}
	if res.TrendDirection != "increasing" {
		t.Errorf("expected increasing direction, got %s", res.TrendDirection)
	}
}

func TestMannKendallDecreasingTrend(t *testing.T) {
	data := []float64{10, 9, 8, 7, 6, 5, 4, 3, 2, 1}
	res, err := MannKendall(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.S != -45.0 {
		t.Errorf("expected S=-45, got %f", res.S)
	}
	if res.Z >= 0 {
		t.Errorf("expected negative Z, got %f", res.Z)
	}
	if res.TrendDirection != "decreasing" {
		t.Errorf("expected decreasing direction, got %s", res.TrendDirection)
	}
}

func TestMannKendallTies(t *testing.T) {
	// Data with ties
	data := []float64{2.0, 2.0, 2.0, 3.0, 3.0, 4.0, 4.0, 5.0, 5.0, 6.0}
	res, err := MannKendall(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.VarianceS <= 0 {
		t.Errorf("variance should be positive, got %f", res.VarianceS)
	}
}

func TestSensSlope(t *testing.T) {
	// Linear sequence: y = 2*x + 1
	data := []float64{3, 5, 7, 9, 11, 13, 15}
	res, err := SensSlope(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if math.Abs(res.Slope-2.0) > 1e-6 {
		t.Errorf("expected slope 2.0, got %f", res.Slope)
	}
	if math.Abs(res.AnnualRate-24.0) > 1e-6 {
		t.Errorf("expected annual rate 24.0, got %f", res.AnnualRate)
	}
}

func TestDeseasonalize(t *testing.T) {
	points := []models.TimeSeriesPoint{
		{Date: "2020-01", Value: 10.0},
		{Date: "2020-02", Value: 20.0},
		{Date: "2021-01", Value: 12.0},
		{Date: "2021-02", Value: 22.0},
	}

	deseas, stats, err := DeseasonalizeTimeSeries(points)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Month 1 mean should be 11.0
	if math.Abs(stats[1].Mean-11.0) > 1e-6 {
		t.Errorf("expected Jan mean 11.0, got %f", stats[1].Mean)
	}
	// Anomaly for first point: 10 - 11 = -1
	if math.Abs(deseas[0].Anomaly - (-1.0)) > 1e-6 {
		t.Errorf("expected anomaly -1.0, got %f", deseas[0].Anomaly)
	}
}
