package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pollo/backend/internal/config"
	"github.com/pollo/backend/internal/earthlink"
)

func TestGIBSLayersEndpoint(t *testing.T) {
	cfg := &config.Config{
		APIPrefix:          "/api/v1",
		CORSAllowedOrigins: []string{"*"},
	}
	router := NewRouter(cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/gibs/layers", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var layers []earthlink.GIBSLayer
	if err := json.Unmarshal(rec.Body.Bytes(), &layers); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(layers) != 3 {
		t.Fatalf("expected 3 layers, got %d", len(layers))
	}

	layerIDs := map[string]bool{}
	for _, l := range layers {
		layerIDs[l.ID] = true
	}

	expectedIDs := []string{
		"MODIS_Terra_CorrectedReflectance_TrueColor",
		"IMERG_Precipitation_Rate",
		"MODIS_Terra_LST_Day",
	}

	for _, id := range expectedIDs {
		if !layerIDs[id] {
			t.Errorf("missing expected layer ID %q", id)
		}
	}
}

func TestGIBSTileProxyEndpoints(t *testing.T) {
	mockUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte("fake-png-tile"))
	}))
	defer mockUpstream.Close()

	cacheDir := t.TempDir()
	cfg := &config.Config{
		APIPrefix:          "/api/v1",
		NASAGIBSEndpoint:   mockUpstream.URL,
		CacheDir:           cacheDir,
		CORSAllowedOrigins: []string{"*"},
	}
	router := NewRouter(cfg)

	t.Run("Tile with Date in Path", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gibs/tiles/IMERG_Precipitation_Rate/2024-01-02/1/0/0", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
		}
		if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
			t.Errorf("expected Content-Type image/png, got %q", ct)
		}
		if rec.Body.String() != "fake-png-tile" {
			t.Errorf("unexpected body: %q", rec.Body.String())
		}
	})

	t.Run("Tile without Date in Path (Uses Query or Default)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gibs/tiles/IMERG_Precipitation_Rate/1/0/0?date=2024-01-02", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("Tile with File Extension in Path", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gibs/tiles/IMERG_Precipitation_Rate/2024-01-02/1/0/0.png", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("Invalid Layer Returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gibs/tiles/non_existent_layer/2024-01-02/1/0/0", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", rec.Code)
		}
	})

	t.Run("Coordinates Out of Bounds Returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gibs/tiles/IMERG_Precipitation_Rate/2024-01-02/1/5/5", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", rec.Code)
		}
	})
}

func TestExportEndpoints(t *testing.T) {
	cfg := &config.Config{
		APIPrefix:          "/api/v1",
		CORSAllowedOrigins: []string{"*"},
	}
	router := NewRouter(cfg)

	t.Run("Export TimeSeries as CSV", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/export/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&format=csv", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
		}
		if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/csv") {
			t.Errorf("expected text/csv Content-Type, got %q", ct)
		}
		if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "attachment") || !strings.Contains(cd, "pollo_timeseries_lake_victoria_basin_GPM_PRECIP.csv") {
			t.Errorf("unexpected Content-Disposition: %q", cd)
		}
		body := rec.Body.String()
		if !strings.Contains(body, "# Region: Lake Victoria Basin") {
			t.Errorf("missing region metadata comment")
		}
		if !strings.Contains(body, "date,timestamp,value,baseline,anomaly,deseasonalized,std_anomaly") {
			t.Errorf("missing CSV table header")
		}
	})

	t.Run("Export TimeSeries as JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/export/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&format=json", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
		}
		if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
			t.Errorf("expected application/json Content-Type, got %q", ct)
		}

		var payload struct {
			Region struct {
				ID string `json:"id"`
			} `json:"region"`
			Variable struct {
				ID string `json:"id"`
			} `json:"variable"`
			DataPoints int `json:"data_points"`
			Series     []struct {
				Date string `json:"date"`
			} `json:"series"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to parse JSON export payload: %v", err)
		}
		if payload.Region.ID != "lake_victoria_basin" {
			t.Errorf("region.id = %q, want 'lake_victoria_basin'", payload.Region.ID)
		}
		if payload.Variable.ID != "GPM_PRECIP" {
			t.Errorf("variable.id = %q, want 'GPM_PRECIP'", payload.Variable.ID)
		}
		if payload.DataPoints != 300 || len(payload.Series) != 300 {
			t.Errorf("expected 300 points, got %d (series len %d)", payload.DataPoints, len(payload.Series))
		}
	})

	t.Run("Export All Geometries as GeoJSON FeatureCollection", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/export/geometries", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
		}
		if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "application/geo+json") {
			t.Errorf("expected application/geo+json Content-Type, got %q", ct)
		}

		var fc struct {
			Type     string `json:"type"`
			Features []struct {
				Type       string                 `json:"type"`
				ID         string                 `json:"id"`
				Properties map[string]interface{} `json:"properties"`
				Geometry   struct {
					Type        string        `json:"type"`
					Coordinates [][][]float64 `json:"coordinates"`
				} `json:"geometry"`
			} `json:"features"`
			BBox []float64 `json:"bbox"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &fc); err != nil {
			t.Fatalf("failed to unmarshal GeoJSON FeatureCollection: %v", err)
		}
		if fc.Type != "FeatureCollection" {
			t.Errorf("type = %q, want 'FeatureCollection'", fc.Type)
		}
		if len(fc.Features) != 4 {
			t.Errorf("expected 4 regions, got %d", len(fc.Features))
		}
	})

	t.Run("Export Single Geometry as GeoJSON Feature", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/export/geometries?region=lake_victoria_basin", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
		}
		var feat struct {
			Type     string                 `json:"type"`
			ID       string                 `json:"id"`
			Geometry map[string]interface{} `json:"geometry"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &feat); err != nil {
			t.Fatalf("failed to unmarshal GeoJSON Feature: %v", err)
		}
		if feat.Type != "Feature" || feat.ID != "lake_victoria_basin" {
			t.Errorf("unexpected feature: %+v", feat)
		}
	})

	t.Run("Export Unknown Region Returns 404", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/export/geometries?region=unknown_region", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected status 404, got %d", rec.Code)
		}
	})

	t.Run("Export Method Not Allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/export/timeseries", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected status 405, got %d", rec.Code)
		}
	})
}
