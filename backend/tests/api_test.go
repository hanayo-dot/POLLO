package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/pollo/backend/api"
	"github.com/pollo/backend/internal/config"
	"github.com/pollo/backend/internal/models"
)

func setupTestRouter() *api.Router {
	cfg := &config.Config{
		Port:                 "8080",
		Env:                  "test",
		APIPrefix:            "/api/v1",
		CORSAllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		CacheDir:             "./data/cache",
		EnableLocalBenchmark: true,
	}
	return api.NewRouter(cfg)
}

func TestHealthEndpoint(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["status"] != "operational" {
		t.Errorf("expected status 'operational', got %v", resp["status"])
	}
	if resp["version"] != "1.0.0" {
		t.Errorf("expected version '1.0.0', got %v", resp["version"])
	}
	if regionsCount, ok := resp["regions_count"].(float64); !ok || regionsCount < 1 {
		t.Errorf("expected positive regions_count, got %v", resp["regions_count"])
	}
}

func TestRegionsEndpoint(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/regions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var regions []models.Region
	if err := json.Unmarshal(w.Body.Bytes(), &regions); err != nil {
		t.Fatalf("failed to decode regions: %v", err)
	}

	foundLakeVictoria := false
	for _, r := range regions {
		if r.ID == "lake_victoria_basin" {
			foundLakeVictoria = true
			if len(r.Jurisdictions) < 3 {
				t.Errorf("expected at least 3 jurisdictions for Lake Victoria, got %d", len(r.Jurisdictions))
			}
		}
	}

	if !foundLakeVictoria {
		t.Errorf("lake_victoria_basin region not found in catalog")
	}
}

func TestDatasetsEndpoint(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/datasets", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var variables []models.DatasetVariable
	if err := json.Unmarshal(w.Body.Bytes(), &variables); err != nil {
		t.Fatalf("failed to decode datasets: %v", err)
	}

	foundGPM := false
	for _, v := range variables {
		if v.ID == "GPM_PRECIP" {
			foundGPM = true
		}
	}
	if !foundGPM {
		t.Errorf("GPM_PRECIP not found in datasets")
	}
}

func TestTimeSeriesEndpoint(t *testing.T) {
	router := setupTestRouter()

	// 1. Full 25-year series test
	req := httptest.NewRequest(http.MethodGet, "/api/v1/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d (body: %s)", w.Code, w.Body.String())
	}

	var resp models.TimeSeriesResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode time series: %v", err)
	}

	if len(resp.Series) != 300 {
		t.Errorf("expected 300 monthly points for 2000-2024, got %d", len(resp.Series))
	}

	if resp.Trend == nil {
		t.Fatalf("expected trend analysis in response")
	}
	if resp.Trend.Significance != "significant" {
		t.Errorf("expected significant trend for Lake Victoria precipitation, got %s", resp.Trend.Significance)
	}

	// 2. Date filtering test (2010 to 2014 = 5 years = 60 months)
	reqFiltered := httptest.NewRequest(http.MethodGet, "/api/v1/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&start=2010-01&end=2014-12", nil)
	wFiltered := httptest.NewRecorder()
	router.ServeHTTP(wFiltered, reqFiltered)

	var respFiltered models.TimeSeriesResponse
	_ = json.Unmarshal(wFiltered.Body.Bytes(), &respFiltered)
	if len(respFiltered.Series) != 60 {
		t.Errorf("expected 60 points for filtered 5-year range, got %d", len(respFiltered.Series))
	}

	// 3. Deseasonalization test
	reqDeseas := httptest.NewRequest(http.MethodGet, "/api/v1/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&deseasonalize=true", nil)
	wDeseas := httptest.NewRecorder()
	router.ServeHTTP(wDeseas, reqDeseas)

	var respDeseas models.TimeSeriesResponse
	_ = json.Unmarshal(wDeseas.Body.Bytes(), &respDeseas)
	if len(respDeseas.Series) > 0 && respDeseas.Series[0].Baseline == 0 {
		t.Errorf("expected baseline climatology populated for deseasonalized series")
	}
}

func TestTrendXAnalyzeEndpoint(t *testing.T) {
	router := setupTestRouter()

	// 1. Regional lookup
	body1 := models.AnalysisRequest{
		RegionID:      "lake_victoria_basin",
		VariableID:    "MERRA2_T2M",
		Deseasonalize: true,
	}
	jsonBytes, _ := json.Marshal(body1)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/trendx/analyze", bytes.NewReader(jsonBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var res models.TrendResult
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode trend result: %v", err)
	}

	if res.PValue > 0.05 {
		t.Errorf("expected warming trend p <= 0.05, got %f", res.PValue)
	}
	if res.SensSlope <= 0 {
		t.Errorf("expected positive warming slope, got %f", res.SensSlope)
	}

	// 2. Custom series test
	bodyCustom := models.AnalysisRequest{
		CustomSeries: []float64{10.0, 12.0, 15.0, 18.0, 22.0, 25.0, 30.0, 35.0},
		Units:        "mm",
	}
	customBytes, _ := json.Marshal(bodyCustom)
	reqCustom := httptest.NewRequest(http.MethodPost, "/api/v1/trendx/analyze", bytes.NewReader(customBytes))
	reqCustom.Header.Set("Content-Type", "application/json")
	wCustom := httptest.NewRecorder()
	router.ServeHTTP(wCustom, reqCustom)

	if wCustom.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", wCustom.Code)
	}

	var customRes models.TrendResult
	_ = json.Unmarshal(wCustom.Body.Bytes(), &customRes)
	if customRes.TrendDirection != "increasing" {
		t.Errorf("expected increasing direction for custom series, got %s", customRes.TrendDirection)
	}
}

func TestDivergenceAnalyzeEndpoint(t *testing.T) {
	router := setupTestRouter()

	body := models.DivergenceRequest{
		RegionAID:     "lake_victoria_basin",
		RegionBID:     "horn_of_africa",
		VariableID:    "GPM_PRECIP",
		Deseasonalize: true,
	}
	jsonBytes, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/divergence/analyze", bytes.NewReader(jsonBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d (body: %s)", w.Code, w.Body.String())
	}

	var analysis models.DivergenceAnalysis
	if err := json.Unmarshal(w.Body.Bytes(), &analysis); err != nil {
		t.Fatalf("failed to decode divergence analysis: %v", err)
	}

	if !analysis.IsBipolar {
		t.Errorf("expected confirmed Bipolar Divergence between Lake Victoria and Horn of Africa")
	}

	if analysis.SlopeDelta <= 0 {
		t.Errorf("expected positive slope delta, got %f", analysis.SlopeDelta)
	}
}

func TestCORSPreflight(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/health", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 for OPTIONS preflight, got %d", w.Code)
	}

	corsHeader := w.Header().Get("Access-Control-Allow-Origin")
	if corsHeader != "http://localhost:3000" {
		t.Errorf("expected CORS header 'http://localhost:3000', got '%s'", corsHeader)
	}
}

// Benchmark tests
func BenchmarkAPITimeSeries(b *testing.B) {
	router := setupTestRouter()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP", nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}
