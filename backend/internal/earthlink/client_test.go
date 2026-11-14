package earthlink

import (
	"context"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pollo/backend/internal/config"
)

func TestBuildWMTSURLUsesLayerMetadataAndXYZCoordinates(t *testing.T) {
	c := NewClient(&config.Config{NASAGIBSEndpoint: "https://example.test/wmts/epsg3857/best"})
	u, err := url.Parse(c.BuildWMTSURL("MODIS_Terra_LST_Day", time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), 4, 3, 8))
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	if got := q.Get("LAYER"); got != "MODIS_Terra_Land_Surface_Temp_Day" {
		t.Fatalf("LAYER = %q", got)
	}
	if got := q.Get("TILEMATRIXSET"); got != "GoogleMapsCompatible_Level7" {
		t.Fatalf("TILEMATRIXSET = %q", got)
	}
	if q.Get("TILEMATRIX") != "4" || q.Get("TILECOL") != "3" || q.Get("TILEROW") != "8" {
		t.Fatalf("unexpected tile coordinates: %v", q)
	}
	if q.Get("FORMAT") != "image/png" || q.Get("TIME") != "2024-01-02" {
		t.Fatalf("unexpected format/date: %v", q)
	}

	// Verify layer lookup also works with the GIBS LayerName directly
	u2, err := url.Parse(c.BuildWMTSURL("MODIS_Terra_Land_Surface_Temp_Day", time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC), 4, 3, 8))
	if err != nil {
		t.Fatal(err)
	}
	if u2.String() != u.String() {
		t.Fatalf("expected identical URL for layer ID and layer name, got %s vs %s", u.String(), u2.String())
	}
}

func TestNewClientNilConfig(t *testing.T) {
	c := NewClient(nil)
	if c == nil || c.cfg == nil {
		t.Fatal("expected non-nil client and config")
	}
}

func TestGetTileFetchesCachesAndUsesConfiguredAuth(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Errorf("Authorization = %q", got)
		}
		if r.URL.Query().Get("LAYER") != "IMERG_Precipitation_Rate" {
			t.Errorf("unexpected layer query: %s", r.URL.RawQuery)
		}
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte("png tile"))
	}))
	defer server.Close()
	cacheDir := t.TempDir()
	c := NewClient(&config.Config{NASAGIBSEndpoint: server.URL, NASAEarthdataToken: "test-token", CacheDir: cacheDir})
	d := time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC)
	for i := 0; i < 2; i++ {
		body, contentType, err := c.GetTile(context.Background(), "IMERG_Precipitation_Rate", d, 2, 1, 2)
		if err != nil {
			t.Fatal(err)
		}
		if string(body) != "png tile" || contentType != "image/png" {
			t.Fatalf("got %q %q", body, contentType)
		}
	}
	if requests != 1 {
		t.Fatalf("upstream requests = %d, want 1", requests)
	}
	want := filepath.Join(cacheDir, "gibs", "IMERG_Precipitation_Rate", "2024-01-02", "2", "1", "2.png")
	if _, err := os.Stat(want); err != nil {
		t.Fatalf("expected cached tile: %v", err)
	}
	if _, err := os.Stat(filepath.Join(cacheDir, "gibs", "IMERG_Precipitation_Rate", "2024-01-02", "2", "1", "2.json")); err != nil {
		t.Fatalf("expected cached metadata: %v", err)
	}
}

func TestGetTileUsesBasicAuthWhenNoToken(t *testing.T) {
	want := "Basic " + base64.StdEncoding.EncodeToString([]byte("user:pass"))
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != want {
			t.Errorf("Authorization = %q, want %q", got, want)
		}
		w.Write([]byte("tile"))
	}))
	defer server.Close()
	c := NewClient(&config.Config{NASAGIBSEndpoint: server.URL, NASAEarthdataUser: "user", NASAEarthdataPass: "pass", CacheDir: t.TempDir()})
	if _, _, err := c.GetTile(context.Background(), "MODIS_Terra_CorrectedReflectance_TrueColor", time.Now(), 0, 0, 0); err != nil {
		t.Fatal(err)
	}
}

func TestGetTileRejectsInvalidLayerAndCoordinates(t *testing.T) {
	c := NewClient(&config.Config{CacheDir: t.TempDir()})
	if _, _, err := c.GetTile(context.Background(), "unknown", time.Now(), 0, 0, 0); err == nil {
		t.Fatal("expected unsupported layer error")
	}
	if _, _, err := c.GetTile(context.Background(), "IMERG_Precipitation_Rate", time.Now(), 7, 0, 0); err == nil {
		t.Fatal("expected zoom validation error")
	}
	if _, _, err := c.GetTile(context.Background(), "IMERG_Precipitation_Rate", time.Now(), 2, 4, 0); err == nil {
		t.Fatal("expected tile bounds validation error")
	}
}

func TestGetTileDoesNotCacheUpstreamErrors(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()
	c := NewClient(&config.Config{NASAGIBSEndpoint: server.URL, CacheDir: t.TempDir()})
	for i := 0; i < 2; i++ {
		if _, _, err := c.GetTile(context.Background(), "IMERG_Precipitation_Rate", time.Now(), 0, 0, 0); err == nil {
			t.Fatal("expected upstream error")
		}
	}
	if requests != 2 {
		t.Fatalf("upstream requests = %d, want 2", requests)
	}
}
