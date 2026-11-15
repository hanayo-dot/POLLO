package observations

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/pollo/backend/internal/models"
)

func TestDailyAggregationRequiresCompleteMonths(t *testing.T) {
	dates := []string{}
	values := []*float64{}
	for day := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC); day.Before(time.Date(2020, 3, 1, 0, 0, 0, 0, time.UTC)); day = day.AddDate(0, 0, 1) {
		v := 2.0
		dates = append(dates, day.Format("2006-01-02"))
		values = append(values, &v)
	}
	totals := aggregateDaily(dates, values, true)
	if len(totals) != 2 || totals[0].Value != 62 || totals[1].Value != 58 {
		t.Fatalf("incorrect leap-year totals: %+v", totals)
	}
	means := aggregateDaily(dates, values, false)
	if means[0].Value != 2 || means[1].Value != 2 {
		t.Fatal("incorrect means")
	}
	values[40] = nil
	incomplete := aggregateDaily(dates, values, true)
	if len(incomplete) != 1 || incomplete[0].Date != "2020-01" {
		t.Fatalf("incomplete month should not produce a total: %+v", incomplete)
	}
	// Duplicate dates must not double rainfall or disguise a missing day.
	dates = append(dates, dates[0])
	values = append(values, values[0])
	if got := aggregateDaily(dates, values, true); len(got) != 1 || got[0].Value != 62 {
		t.Fatal(got)
	}
}

func TestTrendUsesElapsedMonthsAcrossGaps(t *testing.T) {
	points := []models.TimeSeriesPoint{{Date: "2020-01", Value: 0}, {Date: "2020-02", Value: 2}, {Date: "2020-05", Value: 8}, {Date: "2020-08", Value: 14}}
	result := analyse(points, "region", Variables()[0])
	if result == nil || math.Abs(result.SensSlope-2) > 1e-10 || result.AnnualRate != 24 {
		t.Fatalf("incorrect elapsed-month slope: %+v", result)
	}
}

func TestVegetationQualityScreeningAndScaling(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/dates" {
			fmt.Fprint(w, `{"dates":[{"modis_date":"A2020001","calendar_date":"2020-01-01"},{"modis_date":"A2020033","calendar_date":"2020-02-02"},{"modis_date":"A2020065","calendar_date":"2020-03-05"}]}`)
			return
		}
		values := []int{8000, -3000, 6000}
		if r.URL.Query().Get("band") == "250m_16_days_pixel_reliability" {
			values = []int{0, 0, 2}
		}
		json.NewEncoder(w).Encode(map[string]any{"subset": []any{map[string]any{"calendar_date": "2020-01-01", "data": []int{values[0]}}, map[string]any{"calendar_date": "2020-02-02", "data": []int{values[1]}}, map[string]any{"calendar_date": "2020-03-05", "data": []int{values[2]}}}})
	}))
	defer server.Close()
	client := NewClient()
	client.MODISURL = server.URL
	result, err := client.Series(context.Background(), 0, 0, "Test", "MODIS_NDVI", "2020-01", "2020-03")
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Series) != 1 || result.Series[0].Value != 0.8 || result.Source.MissingMonths != 2 || result.Source.Kind != "satellite" {
		t.Fatalf("bad quality/fill handling: %+v", result)
	}
	if result.Trend != nil {
		t.Fatal("must not report inference on one point")
	}
}

func TestProviderFailuresNeverBecomeSyntheticData(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++; http.Error(w, "Unavailable", 503) }))
	defer server.Close()
	client := NewClient()
	client.WeatherURL = server.URL
	for i := 0; i < 2; i++ {
		result, err := client.Series(context.Background(), 0, 0, "Test", "ERA5_TEMP", "2020-01", "2020-02")
		if err == nil || len(result.Series) != 0 {
			t.Fatal("failure must not create observations")
		}
	}
	if calls != 2 {
		t.Fatal("provider errors should not be cached")
	}
}

func TestValidationRejectsInvalidDatesAndCoordinates(t *testing.T) {
	for _, input := range []struct {
		lat, lon   float64
		start, end string
	}{{91, 0, "2020-01", "2020-02"}, {0, math.NaN(), "2020-01", "2020-02"}, {0, 0, "2020-03", "2020-01"}, {0, 0, "2020-13", "2021-01"}, {0, 0, "1940-01", "1941-01"}} {
		if _, _, err := Validate(input.lat, input.lon, input.start, input.end); err == nil {
			t.Fatalf("accepted %+v", input)
		}
	}
}
