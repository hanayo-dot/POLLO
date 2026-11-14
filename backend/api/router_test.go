package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
