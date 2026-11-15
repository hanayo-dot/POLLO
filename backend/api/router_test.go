package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pollo/backend/internal/config"
	"github.com/pollo/backend/internal/data"
	"github.com/pollo/backend/internal/earthlink"
	"github.com/pollo/backend/internal/models"
)

func newTestRouter() *Router {
	cfg := &config.Config{
		Port:                 "8080",
		Env:                  "test",
		APIPrefix:            "/api/v1",
		CORSAllowedOrigins:   []string{"*"},
		EnableLocalBenchmark: true,
		UseSpatialEngine:     true,
	}
	return NewRouter(cfg)
}

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

func TestTimeSeriesHandler_SpatialEngineDefault(t *testing.T) {
	r := newTestRouter()

	req := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp models.TimeSeriesResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	if resp.Region.ID != "lake_victoria_basin" {
		t.Errorf("expected region lake_victoria_basin, got %s", resp.Region.ID)
	}
	if resp.Variable.ID != "GPM_PRECIP" {
		t.Errorf("expected variable GPM_PRECIP, got %s", resp.Variable.ID)
	}
	if len(resp.Series) != 300 {
		t.Errorf("expected 300 monthly points (25 years), got %d", len(resp.Series))
	}
	if resp.Trend == nil {
		t.Fatalf("expected trend analysis result, got nil")
	}
	if resp.Trend.DataPoints != 300 {
		t.Errorf("expected 300 data points in trend result, got %d", resp.Trend.DataPoints)
	}
}

func TestTimeSeriesHandler_AggregationOptions(t *testing.T) {
	r := newTestRouter()

	// 1. Median unweighted
	reqMed := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=MERRA2_T2M&agg=median&weighted=false", nil)
	recMed := httptest.NewRecorder()
	r.ServeHTTP(recMed, reqMed)
	if recMed.Code != http.StatusOK {
		t.Fatalf("median unweighted failed with status %d: %s", recMed.Code, recMed.Body.String())
	}

	// 2. Variance weighted
	reqVar := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=MERRA2_T2M&agg=variance&weighted=true", nil)
	recVar := httptest.NewRecorder()
	r.ServeHTTP(recVar, reqVar)
	if recVar.Code != http.StatusOK {
		t.Fatalf("variance weighted failed with status %d: %s", recVar.Code, recVar.Body.String())
	}

	// 3. Invalid aggregation type -> 400 Bad Request
	reqBadAgg := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=MERRA2_T2M&agg=unsupported_operator", nil)
	recBadAgg := httptest.NewRecorder()
	r.ServeHTTP(recBadAgg, reqBadAgg)
	if recBadAgg.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for bad agg type, got %d", recBadAgg.Code)
	}
}

func TestTimeSeriesHandler_EngineSelection(t *testing.T) {
	r := newTestRouter()

	// Explicit spatial engine
	reqSpatial := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&engine=spatial", nil)
	recSpatial := httptest.NewRecorder()
	r.ServeHTTP(recSpatial, reqSpatial)
	if recSpatial.Code != http.StatusOK {
		t.Fatalf("engine=spatial failed with status %d: %s", recSpatial.Code, recSpatial.Body.String())
	}

	// Explicit legacy engine
	reqLegacy := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&engine=legacy", nil)
	recLegacy := httptest.NewRecorder()
	r.ServeHTTP(recLegacy, reqLegacy)
	if recLegacy.Code != http.StatusOK {
		t.Fatalf("engine=legacy failed with status %d: %s", recLegacy.Code, recLegacy.Body.String())
	}
}

func TestTimeSeriesHandler_Deseasonalize(t *testing.T) {
	r := newTestRouter()

	req := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=MERRA2_T2M&deseasonalize=true", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("deseasonalize=true failed with status %d: %s", rec.Code, rec.Body.String())
	}

	var resp models.TimeSeriesResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(resp.Series) != 300 {
		t.Fatalf("expected 300 series points, got %d", len(resp.Series))
	}
	// Anomaly values should have mean near zero
	var sum float64
	for _, p := range resp.Series {
		sum += p.Anomaly
	}
	meanAnomaly := sum / float64(len(resp.Series))
	if meanAnomaly > 0.5 || meanAnomaly < -0.5 {
		t.Errorf("expected mean anomaly close to 0.0, got %f", meanAnomaly)
	}
}

func TestTimeSeriesHandler_NotFoundAndUnsupportedErrors(t *testing.T) {
	r := newTestRouter()

	// 1. Unknown region -> 404
	reqReg := httptest.NewRequest("GET", "/api/v1/timeseries?region=non_existent_region&variable=GPM_PRECIP", nil)
	recReg := httptest.NewRecorder()
	r.ServeHTTP(recReg, reqReg)
	if recReg.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unknown region, got %d", recReg.Code)
	}

	// 2. Unknown variable -> 404
	reqVar := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=non_existent_var", nil)
	recVar := httptest.NewRecorder()
	r.ServeHTTP(recVar, reqVar)
	if recVar.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unknown variable, got %d", recVar.Code)
	}

	// 3. Variable with unsupported resolution -> 400 Bad Request
	badVar := models.DatasetVariable{
		ID:                "BAD_RES_API_TEST",
		Name:              "Bad Res Var",
		SpatialResolution: "0.25° (unsupported)",
	}
	data.RegisterVariable(badVar)
	defer data.UnregisterVariable(badVar.ID)

	reqBadRes := httptest.NewRequest("GET", "/api/v1/timeseries?region=lake_victoria_basin&variable=BAD_RES_API_TEST", nil)
	recBadRes := httptest.NewRecorder()
	r.ServeHTTP(recBadRes, reqBadRes)
	if recBadRes.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for unsupported spatial resolution, got %d", recBadRes.Code)
	}
}

func TestTrendAnalyzeHandler_SpatialIntegration(t *testing.T) {
	r := newTestRouter()

	body := models.AnalysisRequest{
		RegionID:   "lake_victoria_basin",
		VariableID: "MERRA2_T2M",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/trendx/analyze", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var trend models.TrendResult
	if err := json.NewDecoder(rec.Body).Decode(&trend); err != nil {
		t.Fatalf("failed to decode TrendResult: %v", err)
	}

	if trend.RegionID != "lake_victoria_basin" || trend.VariableID != "MERRA2_T2M" {
		t.Errorf("unexpected trend identifiers: region=%s, var=%s", trend.RegionID, trend.VariableID)
	}
	if trend.DataPoints != 300 {
		t.Errorf("expected 300 data points, got %d", trend.DataPoints)
	}
}

func TestDivergenceAnalyzeHandler_SpatialIntegration(t *testing.T) {
	r := newTestRouter()

	body := models.DivergenceRequest{
		RegionAID:     "lake_victoria_basin",
		RegionBID:     "horn_of_africa",
		VariableID:    "GPM_PRECIP",
		Deseasonalize: true,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/api/v1/divergence/analyze", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var analysis models.DivergenceAnalysis
	if err := json.NewDecoder(rec.Body).Decode(&analysis); err != nil {
		t.Fatalf("failed to decode DivergenceAnalysis: %v", err)
	}

	if analysis.RegionA.ID != "lake_victoria_basin" || analysis.RegionB.ID != "horn_of_africa" {
		t.Errorf("unexpected region IDs in divergence: A=%s, B=%s", analysis.RegionA.ID, analysis.RegionB.ID)
	}
	if analysis.TrendA.DataPoints != 300 || analysis.TrendB.DataPoints != 300 {
		t.Errorf("expected 300 points for each region trend, got A=%d, B=%d", analysis.TrendA.DataPoints, analysis.TrendB.DataPoints)
	}
}
