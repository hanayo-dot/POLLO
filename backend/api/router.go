package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/pollo/backend/internal/config"
	"github.com/pollo/backend/internal/data"
	"github.com/pollo/backend/internal/divergence"
	"github.com/pollo/backend/internal/earthlink"
	"github.com/pollo/backend/internal/export"
	"github.com/pollo/backend/internal/geospatial"
	"github.com/pollo/backend/internal/models"
	"github.com/pollo/backend/internal/observations"
	"github.com/pollo/backend/internal/trendx"
)

var startTime = time.Now()

const methodNotAllowed = "Method not allowed"
const tileCoordinatesMustBeIntegers = "Tile coordinates must be integers"

// Router handles API endpoints and middleware orchestration
type Router struct {
	cfg       *config.Config
	earthlink *earthlink.Client
	mux       *http.ServeMux
	handler   http.Handler
}

// NewRouter initializes HTTP router with API endpoints and middleware
func NewRouter(cfg *config.Config) *Router {
	r := &Router{
		cfg:       cfg,
		earthlink: earthlink.NewClient(cfg),
		mux:       http.NewServeMux(),
	}
	r.registerRoutes()
	r.handler = r.applyMiddleware(r.mux)
	return r
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.handler.ServeHTTP(w, req)
}

// applyMiddleware wraps the mux in CORS, Panic Recovery, and Structured Logging
func (r *Router) applyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		start := time.Now()

		// 1. Panic Recovery
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[PANIC RECOVERED] %v\nStack: %s", rec, string(debug.Stack()))
				respondError(w, http.StatusInternalServerError, "Internal server error")
			}
		}()

		// 2. CORS Handling
		origin := req.Header.Get("Origin")
		allowOrigin := "*"
		if origin != "" && len(r.cfg.CORSAllowedOrigins) > 0 {
			for _, allowed := range r.cfg.CORSAllowedOrigins {
				if allowed == "*" || allowed == origin {
					allowOrigin = origin
					break
				}
			}
		}
		w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if req.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Response status capture
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		// Next handler execution
		next.ServeHTTP(sw, req)

		// 3. Structured Logging
		duration := time.Since(start)
		log.Printf("[HTTP] %s %s | Status: %d | Duration: %v | IP: %s",
			req.Method, req.URL.Path, sw.status, duration, req.RemoteAddr)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (r *Router) registerRoutes() {
	prefix := r.cfg.APIPrefix

	r.mux.HandleFunc(prefix+"/health", r.handleHealth)
	r.mux.HandleFunc(prefix+"/regions", r.handleRegions)
	r.mux.HandleFunc(prefix+"/datasets", r.handleDatasets)
	r.mux.HandleFunc(prefix+"/timeseries", r.handleTimeSeries)
	r.mux.HandleFunc(prefix+"/trendx/analyze", r.handleTrendAnalyze)
	r.mux.HandleFunc(prefix+"/divergence/analyze", r.handleDivergenceAnalyze)
	r.mux.HandleFunc(prefix+"/gibs/layers", r.handleGIBSLayers)
	r.mux.HandleFunc(prefix+"/gibs/tiles/{layer}/{date}/{z}/{x}/{y}", r.handleGIBSTile)
	r.mux.HandleFunc(prefix+"/gibs/tiles/{layer}/{z}/{x}/{y}", r.handleGIBSTile)
	r.mux.HandleFunc(prefix+"/export/timeseries", r.handleExportTimeSeries)
	r.mux.HandleFunc(prefix+"/export/geometries", r.handleExportGeometries)
}

func (r *Router) handleHealth(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}

	uptimeSeconds := int64(time.Since(startTime).Seconds())
	res := map[string]interface{}{
		"status":          "operational",
		"version":         "1.0.0",
		"timestamp":       time.Now().UTC().Format(time.RFC3339),
		"uptime_seconds":  uptimeSeconds,
		"platform":        "POLLO Earth System Intelligence",
		"mode":            r.cfg.Env,
		"regions_count":   len(data.AvailableRegions()),
		"variables_count": len(data.AvailableVariables()),
		"benchmark":       "Lake Victoria Basin (2000-2024)",
	}
	respondJSON(w, http.StatusOK, res)
}

func (r *Router) handleRegions(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}
	respondJSON(w, http.StatusOK, data.AvailableRegions())
}

func (r *Router) handleDatasets(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}
	respondJSON(w, http.StatusOK, append(data.AvailableVariables(), observations.Variables()...))
}

func (r *Router) handleTimeSeries(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}

	query := req.URL.Query()
	if query.Has("latitude") || query.Has("longitude") {
		respondError(w, http.StatusBadRequest, "Select a region from /regions; arbitrary-coordinate analysis is not enabled")
		return
	}
	regionID := query.Get("region")
	if regionID == "" {
		regionID = "lake_victoria_basin"
	}
	variableID := query.Get("variable")
	if variableID == "" {
		variableID = "GPM_PRECIP"
	}
	deseasonalize := strings.ToLower(query.Get("deseasonalize")) == "true"
	startDate := query.Get("start") // YYYY-MM
	endDate := query.Get("end")     // YYYY-MM

	reg, okR := data.GetRegion(regionID)
	if !okR {
		respondError(w, http.StatusNotFound, fmt.Sprintf("Region '%s' not found", regionID))
		return
	}
	for _, observed := range observations.Variables() {
		if observed.ID == variableID {
			r.handleObservedRegion(w, req, *reg)
			return
		}
	}
	v, okV := data.GetVariable(variableID)
	if !okV {
		respondError(w, http.StatusNotFound, fmt.Sprintf("Variable '%s' not found", variableID))
		return
	}

	// Engine selection: default to spatial extraction (2D geospatial raster clipping & aggregation)
	engineParam := strings.ToLower(query.Get("engine"))
	useSpatial := r.cfg.UseSpatialEngine
	if engineParam == "legacy" || engineParam == "1d" {
		useSpatial = false
	} else if engineParam == "spatial" || engineParam == "2d" {
		useSpatial = true
	}

	aggType := geospatial.AggMean
	if aggStr := query.Get("agg"); aggStr != "" {
		var err error
		aggType, err = geospatial.ParseAggregationType(aggStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, fmt.Sprintf("invalid aggregation type: %s", err.Error()))
			return
		}
	}

	weighted := true
	if wStr := query.Get("weighted"); wStr != "" {
		weighted = strings.ToLower(wStr) == "true" || wStr == "1"
	}

	var points []models.TimeSeriesPoint
	var err error
	if useSpatial {
		points, err = data.ExtractRegionSpatialTimeSeries(regionID, variableID, aggType, weighted)
	} else {
		points, err = data.GenerateBenchmarkTimeSeriesLegacy(regionID, variableID)
	}

	if err != nil {
		if strings.Contains(err.Error(), "unsupported or invalid spatial resolution") {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Filter date range if specified
	if startDate != "" || endDate != "" {
		points = filterDateRange(points, startDate, endDate)
	}

	if len(points) == 0 {
		respondError(w, http.StatusBadRequest, "No data available for the specified range")
		return
	}

	var series []models.TimeSeriesPoint
	var dataVals []float64

	if deseasonalize {
		deseas, _, err := trendx.DeseasonalizeTimeSeries(points)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Deseasonalization failed: %v", err))
			return
		}
		series = deseas
		dataVals = make([]float64, len(deseas))
		for i, p := range deseas {
			dataVals[i] = p.Anomaly
		}
	} else {
		series = points
		dataVals = make([]float64, len(points))
		for i, p := range points {
			dataVals[i] = p.Value
		}
	}

	var trendRes *models.TrendResult
	if len(dataVals) >= 4 {
		mk, err := trendx.MannKendall(dataVals)
		if err == nil {
			sens, _ := trendx.SensSlope(dataVals)
			trendRes = &models.TrendResult{
				VariableID:     variableID,
				RegionID:       regionID,
				DataPoints:     mk.N,
				StartDate:      series[0].Date,
				EndDate:        series[len(series)-1].Date,
				S:              mk.S,
				VarianceS:      mk.VarianceS,
				Z:              mk.Z,
				PValue:         mk.PValue,
				Tau:            mk.Tau,
				SensSlope:      sens.Slope,
				AnnualRate:     sens.AnnualRate,
				Units:          v.Units,
				Significance:   mk.Significance,
				TrendDirection: mk.TrendDirection,
				Interpretation: fmt.Sprintf("%s exhibits a %s trend at a rate of %+.3f %s/year (p=%.4e, Kendall tau=%+.3f)",
					reg.Name, mk.TrendDirection, sens.AnnualRate, v.Units, mk.PValue, mk.Tau),
			}
		}
	}

	respondJSON(w, http.StatusOK, models.TimeSeriesResponse{
		Region:   *reg,
		Variable: *v,
		Series:   series,
		Trend:    trendRes,
	})
}

func (r *Router) handleTrendAnalyze(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}

	var body models.AnalysisRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}

	var vals []float64
	var regionID, variableID, startDate, endDate, units string

	if len(body.CustomSeries) > 0 {
		// Custom data analysis
		vals = body.CustomSeries
		regionID = "custom"
		variableID = "custom"
		units = body.Units
		if units == "" {
			units = "units"
		}
		startDate = "T0"
		endDate = fmt.Sprintf("T%d", len(vals)-1)
	} else {
		// Region & Variable lookup
		if body.RegionID == "" {
			body.RegionID = "lake_victoria_basin"
		}
		if body.VariableID == "" {
			body.VariableID = "GPM_PRECIP"
		}

		v, okV := data.GetVariable(body.VariableID)
		if !okV {
			respondError(w, http.StatusNotFound, "Variable not found: "+body.VariableID)
			return
		}
		units = v.Units

		points, err := data.GenerateBenchmarkTimeSeries(body.RegionID, body.VariableID)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		if body.StartDate != "" || body.EndDate != "" {
			points = filterDateRange(points, body.StartDate, body.EndDate)
		}

		if len(points) == 0 {
			respondError(w, http.StatusBadRequest, "No data in selected date range")
			return
		}

		startDate = points[0].Date
		endDate = points[len(points)-1].Date
		regionID = body.RegionID
		variableID = body.VariableID

		if body.Deseasonalize {
			deseas, _, err := trendx.DeseasonalizeTimeSeries(points)
			if err != nil {
				respondError(w, http.StatusInternalServerError, "Deseasonalization error: "+err.Error())
				return
			}
			vals = make([]float64, len(deseas))
			for i, p := range deseas {
				vals[i] = p.Anomaly
			}
		} else {
			vals = make([]float64, len(points))
			for i, p := range points {
				vals[i] = p.Value
			}
		}
	}

	if len(vals) < 4 {
		respondError(w, http.StatusBadRequest, fmt.Sprintf("At least 4 data points required for Mann-Kendall test, got %d", len(vals)))
		return
	}

	mk, err := trendx.MannKendall(vals)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	sens, _ := trendx.SensSlope(vals)

	interpretation := fmt.Sprintf("%s trend detected (Annual rate: %+.3f %s/year, p=%.4e, Z=%.2f, S=%.0f)",
		mk.TrendDirection, sens.AnnualRate, units, mk.PValue, mk.Z, mk.S)

	respondJSON(w, http.StatusOK, models.TrendResult{
		VariableID:     variableID,
		RegionID:       regionID,
		DataPoints:     mk.N,
		StartDate:      startDate,
		EndDate:        endDate,
		S:              mk.S,
		VarianceS:      mk.VarianceS,
		Z:              mk.Z,
		PValue:         mk.PValue,
		Tau:            mk.Tau,
		SensSlope:      sens.Slope,
		AnnualRate:     sens.AnnualRate,
		Units:          units,
		Significance:   mk.Significance,
		TrendDirection: mk.TrendDirection,
		Interpretation: interpretation,
	})
}

func (r *Router) handleDivergenceAnalyze(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}

	var body models.DivergenceRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid JSON body: "+err.Error())
		return
	}

	if body.RegionAID == "" || body.RegionBID == "" {
		respondError(w, http.StatusBadRequest, "Both region_a_id and region_b_id are required")
		return
	}
	if body.VariableID == "" {
		body.VariableID = "GPM_PRECIP"
	}

	analysis, err := divergence.Analyze(body.RegionAID, body.RegionBID, body.VariableID, body.Deseasonalize)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, analysis)
}

func (r *Router) handleGIBSLayers(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}
	respondJSON(w, http.StatusOK, r.earthlink.GetAvailableGIBSLayers())
}

func (r *Router) handleGIBSTile(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}

	dateStr := req.PathValue("date")
	if dateStr == "" {
		dateStr = req.URL.Query().Get("date")
	}

	var date time.Time
	if dateStr != "" {
		var err error
		date, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Date must use YYYY-MM-DD")
			return
		}
	} else {
		// Default to yesterday in UTC to account for GIBS processing latency
		date = time.Now().UTC().AddDate(0, 0, -1)
	}

	zStr := req.PathValue("z")
	xStr := req.PathValue("x")
	yStr := strings.TrimSuffix(req.PathValue("y"), filepath.Ext(req.PathValue("y")))

	z, err := strconv.Atoi(zStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, tileCoordinatesMustBeIntegers)
		return
	}
	x, err := strconv.Atoi(xStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, tileCoordinatesMustBeIntegers)
		return
	}
	y, err := strconv.Atoi(yStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, tileCoordinatesMustBeIntegers)
		return
	}

	content, contentType, err := r.earthlink.GetTile(req.Context(), req.PathValue("layer"), date, z, x, y)
	if err != nil {
		status := http.StatusBadGateway
		if strings.Contains(err.Error(), "unsupported GIBS layer") || strings.Contains(err.Error(), "outside the supported matrix") || strings.Contains(err.Error(), "date is required") {
			status = http.StatusBadRequest
		} else if strings.Contains(err.Error(), "GIBS returned HTTP 404") {
			status = http.StatusNotFound
		}
		respondError(w, status, err.Error())
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(content)
}

func (r *Router) handleExportTimeSeries(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}

	query := req.URL.Query()
	regionID := query.Get("region")
	if regionID == "" {
		regionID = "lake_victoria_basin"
	}
	variableID := query.Get("variable")
	if variableID == "" {
		variableID = "GPM_PRECIP"
	}
	format := strings.ToLower(query.Get("format"))
	if format == "" {
		format = "csv"
	}
	deseasonalize := strings.ToLower(query.Get("deseasonalize")) != "false"
	startDate := query.Get("start")
	endDate := query.Get("end")

	reg, okR := data.GetRegion(regionID)
	if !okR {
		respondError(w, http.StatusNotFound, fmt.Sprintf("Region '%s' not found", regionID))
		return
	}
	v, okV := data.GetVariable(variableID)
	if !okV {
		respondError(w, http.StatusNotFound, fmt.Sprintf("Variable '%s' not found", variableID))
		return
	}

	points, err := data.GenerateBenchmarkTimeSeries(regionID, variableID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if startDate != "" || endDate != "" {
		points = filterDateRange(points, startDate, endDate)
	}
	if len(points) == 0 {
		respondError(w, http.StatusBadRequest, "No data available for the specified range")
		return
	}

	var series []models.TimeSeriesPoint
	var dataVals []float64

	if deseasonalize {
		deseas, _, err := trendx.DeseasonalizeTimeSeries(points)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Deseasonalization failed: %v", err))
			return
		}
		series = deseas
		dataVals = make([]float64, len(deseas))
		for i, p := range deseas {
			dataVals[i] = p.Anomaly
		}
	} else {
		series = points
		dataVals = make([]float64, len(points))
		for i, p := range points {
			dataVals[i] = p.Value
		}
	}

	var trendRes *models.TrendResult
	if len(dataVals) >= 4 {
		mk, err := trendx.MannKendall(dataVals)
		if err == nil {
			sens, _ := trendx.SensSlope(dataVals)
			trendRes = &models.TrendResult{
				VariableID:     variableID,
				RegionID:       regionID,
				DataPoints:     mk.N,
				StartDate:      series[0].Date,
				EndDate:        series[len(series)-1].Date,
				S:              mk.S,
				VarianceS:      mk.VarianceS,
				Z:              mk.Z,
				PValue:         mk.PValue,
				Tau:            mk.Tau,
				SensSlope:      sens.Slope,
				AnnualRate:     sens.AnnualRate,
				Units:          v.Units,
				Significance:   mk.Significance,
				TrendDirection: mk.TrendDirection,
				Interpretation: fmt.Sprintf("%s exhibits a %s trend (Z = %+.2f, p = %.6f, Sen's slope = %+.4f %s/yr).",
					reg.Name, mk.TrendDirection, mk.Z, mk.PValue, sens.AnnualRate, v.Units),
			}
		}
	}

	var body []byte
	var contentType, filename string

	if format == "json" {
		body, err = export.BuildTimeSeriesJSON(reg, v, series, trendRes, deseasonalize)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Export JSON failed: %v", err))
			return
		}
		contentType = "application/json; charset=utf-8"
		filename = fmt.Sprintf("pollo_timeseries_%s_%s.json", regionID, variableID)
	} else {
		body, err = export.BuildTimeSeriesCSV(reg, v, series, trendRes, deseasonalize)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Export CSV failed: %v", err))
			return
		}
		contentType = "text/csv; charset=utf-8"
		filename = fmt.Sprintf("pollo_timeseries_%s_%s.csv", regionID, variableID)
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("Cache-Control", "public, max-age=300")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func (r *Router) handleExportGeometries(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, methodNotAllowed)
		return
	}

	regionID := strings.TrimSpace(req.URL.Query().Get("region"))
	var body []byte
	var filename string
	var err error

	if regionID == "" || regionID == "all" {
		regions := data.AvailableRegions()
		body, err = export.BuildGeometriesGeoJSON(regions)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Export GeoJSON failed: %v", err))
			return
		}
		filename = "pollo_geometries_all.geojson"
	} else {
		reg, ok := data.GetRegion(regionID)
		if !ok {
			respondError(w, http.StatusNotFound, fmt.Sprintf("Region '%s' not found", regionID))
			return
		}
		body, err = export.BuildRegionGeoJSON(reg)
		if err != nil {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("Export GeoJSON failed: %v", err))
			return
		}
		filename = fmt.Sprintf("pollo_geometry_%s.geojson", regionID)
	}

	w.Header().Set("Content-Type", "application/geo+json; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func filterDateRange(points []models.TimeSeriesPoint, start, end string) []models.TimeSeriesPoint {
	var filtered []models.TimeSeriesPoint
	for _, p := range points {
		if start != "" && p.Date < start {
			continue
		}
		if end != "" && p.Date > end {
			continue
		}
		filtered = append(filtered, p)
	}
	return filtered
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   message,
		"code":    status,
		"status":  strconv.Itoa(status),
		"success": false,
	})
}
