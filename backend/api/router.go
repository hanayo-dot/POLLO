package api

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/pollo/backend/internal/config"
	"github.com/pollo/backend/internal/data"
	"github.com/pollo/backend/internal/divergence"
	"github.com/pollo/backend/internal/earthlink"
	"github.com/pollo/backend/internal/models"
	"github.com/pollo/backend/internal/trendx"
)

const methodNotAllowed = "Method not allowed"

// Router handles API endpoints
type Router struct {
	cfg       *config.Config
	earthlink *earthlink.Client
	mux       *http.ServeMux
}

// NewRouter initializes HTTP router with API endpoints
func NewRouter(cfg *config.Config) *Router {
	r := &Router{
		cfg:       cfg,
		earthlink: earthlink.NewClient(cfg),
		mux:       http.NewServeMux(),
	}
	r.registerRoutes()
	return r
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// CORS Middleware
	origin := req.Header.Get("Origin")
	if origin != "" {
		for _, allowed := range r.cfg.CORSAllowedOrigins {
			if allowed == "*" || allowed == origin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
	} else {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if req.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	r.mux.ServeHTTP(w, req)
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
}

func (r *Router) handleHealth(w http.ResponseWriter, req *http.Request) {
	respondJSON(w, http.StatusOK, models.SystemStatus{
		Status:    "operational",
		Version:   "1.0.0",
		Timestamp: time.Now().UTC(),
		Platform:  "POLLO Earth System Intelligence",
		Mode:      r.cfg.Env,
	})
}

func (r *Router) handleRegions(w http.ResponseWriter, req *http.Request) {
	respondJSON(w, http.StatusOK, data.AvailableRegions())
}

func (r *Router) handleDatasets(w http.ResponseWriter, req *http.Request) {
	respondJSON(w, http.StatusOK, data.AvailableVariables())
}

func (r *Router) handleTimeSeries(w http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	regionID := query.Get("region")
	if regionID == "" {
		regionID = "lake_victoria_basin"
	}
	variableID := query.Get("variable")
	if variableID == "" {
		variableID = "GPM_PRECIP"
	}
	deseasonalize := strings.ToLower(query.Get("deseasonalize")) == "true"

	reg, okR := data.GetRegion(regionID)
	if !okR {
		http.Error(w, "Region not found", http.StatusNotFound)
		return
	}
	v, okV := data.GetVariable(variableID)
	if !okV {
		http.Error(w, "Variable not found", http.StatusNotFound)
		return
	}

	points, err := data.GenerateBenchmarkTimeSeries(regionID, variableID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var series []models.TimeSeriesPoint
	var dataVals []float64

	if deseasonalize {
		deseas, _, err := trendx.DeseasonalizeTimeSeries(points)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
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

	mk, err := trendx.MannKendall(dataVals)
	var trendRes *models.TrendResult
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
			Interpretation: mk.Significance,
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
		http.Error(w, methodNotAllowed, http.StatusMethodNotAllowed)
		return
	}

	var body models.AnalysisRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	points, err := data.GenerateBenchmarkTimeSeries(body.RegionID, body.VariableID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	vals := make([]float64, len(points))
	for i, p := range points {
		vals[i] = p.Value
	}

	mk, err := trendx.MannKendall(vals)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	sens, _ := trendx.SensSlope(vals)

	respondJSON(w, http.StatusOK, models.TrendResult{
		VariableID:     body.VariableID,
		RegionID:       body.RegionID,
		DataPoints:     mk.N,
		StartDate:      points[0].Date,
		EndDate:        points[len(points)-1].Date,
		S:              mk.S,
		VarianceS:      mk.VarianceS,
		Z:              mk.Z,
		PValue:         mk.PValue,
		Tau:            mk.Tau,
		SensSlope:      sens.Slope,
		AnnualRate:     sens.AnnualRate,
		Significance:   mk.Significance,
		TrendDirection: mk.TrendDirection,
	})
}

func (r *Router) handleDivergenceAnalyze(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, methodNotAllowed, http.StatusMethodNotAllowed)
		return
	}

	var body models.DivergenceRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	analysis, err := divergence.Analyze(body.RegionAID, body.RegionBID, body.VariableID, body.Deseasonalize)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, analysis)
}

func (r *Router) handleGIBSLayers(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, methodNotAllowed, http.StatusMethodNotAllowed)
		return
	}
	respondJSON(w, http.StatusOK, r.earthlink.GetAvailableGIBSLayers())
}

func (r *Router) handleGIBSTile(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, methodNotAllowed, http.StatusMethodNotAllowed)
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
			http.Error(w, "Date must use YYYY-MM-DD", http.StatusBadRequest)
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
		http.Error(w, "Tile coordinates must be integers", http.StatusBadRequest)
		return
	}
	x, err := strconv.Atoi(xStr)
	if err != nil {
		http.Error(w, "Tile coordinates must be integers", http.StatusBadRequest)
		return
	}
	y, err := strconv.Atoi(yStr)
	if err != nil {
		http.Error(w, "Tile coordinates must be integers", http.StatusBadRequest)
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
		http.Error(w, err.Error(), status)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(content)
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
