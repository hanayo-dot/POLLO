package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/pollo/backend/internal/config"
	"github.com/pollo/backend/internal/data"
	"github.com/pollo/backend/internal/models"
	"github.com/pollo/backend/internal/observations"
)

func TestCoordinateSearchIsNotExposed(t *testing.T) {
	router := NewRouter(config.Load())
	for _, path := range []string{"/api/v1/locations/search?q=London", "/api/v1/timeseries?latitude=51.5&longitude=0&variable=ERA5_TEMP&start=2020-01&end=2021-01"} {
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
		if recorder.Code < 400 {
			t.Fatalf("unexpected coordinate/search success: %s", path)
		}
	}
	if len(data.AvailableRegions()) != 4 {
		t.Fatal("region catalog must remain unchanged")
	}
}

func TestObservedRegionKeepsProvenanceAndCachesMeasurements(t *testing.T) {
	dates := []string{}
	values := []float64{}
	for day := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC); day.Before(time.Date(2020, 5, 1, 0, 0, 0, 0, time.UTC)); day = day.AddDate(0, 0, 1) {
		dates = append(dates, day.Format("2006-01-02"))
		values = append(values, 1)
	}
	calls := 0
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		json.NewEncoder(w).Encode(map[string]any{"daily": map[string]any{"time": dates, "rain_sum": values}})
	}))
	defer provider.Close()
	previous := observationClient
	observationClient = observations.NewClient()
	observationClient.WeatherURL = provider.URL
	defer func() { observationClient = previous }()
	router := NewRouter(config.Load())
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/timeseries?region=lake_victoria_basin&variable=ERA5_RAIN&start=2020-01&end=2020-04", nil))
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
		var result models.TimeSeriesResponse
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if len(result.Series) != 4 || result.Series[0].Value != 31 || result.Source == nil || result.Source.Kind != "reanalysis" || result.Trend.RegionID != "lake_victoria_basin" {
			t.Fatalf("invalid observed response: %+v", result)
		}
		if strings.Count(result.Source.Description, "Reference point:") != 1 {
			t.Fatal("cached provenance mutated")
		}
	}
	if calls != 1 {
		t.Fatalf("expected cached provider response, got %d calls", calls)
	}
}
