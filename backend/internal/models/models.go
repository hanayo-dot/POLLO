package models

import "time"

// BoundingBox represents [minLon, minLat, maxLon, maxLat]
type BoundingBox struct {
	MinLon float64 `json:"min_lon"`
	MinLat float64 `json:"min_lat"`
	MaxLon float64 `json:"max_lon"`
	MaxLat float64 `json:"max_lat"`
}

// Region represents a geographical region for monitoring
type Region struct {
	ID            string      `json:"id"`
	Name          string      `json:"name"`
	Country       string      `json:"country"`
	Jurisdictions []string    `json:"jurisdictions"`
	BBox          BoundingBox `json:"bbox"`
	AreaSqKm      float64     `json:"area_sq_km"`
	Description   string      `json:"description"`
}

// DatasetVariable represents an Earth observation variable
type DatasetVariable struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	Mission            string   `json:"mission"`
	Instrument         string   `json:"instrument"`
	ProducingOrg       string   `json:"producing_org"`
	Units              string   `json:"units"`
	SpatialResolution  string   `json:"spatial_resolution"`
	TemporalResolution string   `json:"temporal_resolution"`
	Category           string   `json:"category"` // atmosphere, precipitation, land, vegetation
	BaselinePeriod     string   `json:"baseline_period"`
	SupportedRegions   []string `json:"supported_regions"`
}

// TimeSeriesPoint represents an individual temporal observation
type TimeSeriesPoint struct {
	Date           string  `json:"date"` // YYYY-MM
	Timestamp      int64   `json:"timestamp"`
	Value          float64 `json:"value"`
	Baseline       float64 `json:"baseline,omitempty"`
	Anomaly        float64 `json:"anomaly,omitempty"`
	Deseasonalized float64 `json:"deseasonalized,omitempty"`
	StdAnomaly     float64 `json:"std_anomaly,omitempty"`
}

// TrendResult encapsulates Mann-Kendall and Sen's Slope results
type TrendResult struct {
	VariableID     string  `json:"variable_id"`
	RegionID       string  `json:"region_id"`
	DataPoints     int     `json:"data_points"`
	StartDate      string  `json:"start_date"`
	EndDate        string  `json:"end_date"`
	S              float64 `json:"s_statistic"`
	VarianceS      float64 `json:"variance_s"`
	Z              float64 `json:"z_statistic"`
	PValue         float64 `json:"p_value"`
	Tau            float64 `json:"kendall_tau"`
	SensSlope      float64 `json:"sens_slope"`       // change per month
	AnnualRate     float64 `json:"annual_rate"`      // change per year (SensSlope * 12)
	Units          string  `json:"units"`
	Significance   string  `json:"significance"`    // "significant", "marginal", "none"
	TrendDirection string  `json:"trend_direction"` // "increasing", "decreasing", "neutral"
	Interpretation string  `json:"interpretation"`
}

// DivergenceAnalysis represents paired contrast between two regions
type DivergenceAnalysis struct {
	VariableID        string      `json:"variable_id"`
	RegionA           Region      `json:"region_a"`
	RegionB           Region      `json:"region_b"`
	TrendA            TrendResult `json:"trend_a"`
	TrendB            TrendResult `json:"trend_b"`
	SlopeDelta        float64     `json:"slope_delta"`
	DivergenceMetric  float64     `json:"divergence_metric"`
	IsBipolar         bool        `json:"is_bipolar"`
	ScientificSummary string      `json:"scientific_summary"`
}

// AnalysisRequest input payload for trend detection
type AnalysisRequest struct {
	RegionID       string `json:"region_id"`
	VariableID     string `json:"variable_id"`
	StartDate      string `json:"start_date"` // YYYY-MM (optional)
	EndDate        string `json:"end_date"`   // YYYY-MM (optional)
	Deseasonalize  bool   `json:"deseasonalize"`
}

// DivergenceRequest input payload for regional comparison
type DivergenceRequest struct {
	RegionAID     string `json:"region_a_id"`
	RegionBID     string `json:"region_b_id"`
	VariableID    string `json:"variable_id"`
	Deseasonalize bool   `json:"deseasonalize"`
}

// TimeSeriesResponse API response payload
type TimeSeriesResponse struct {
	Region   Region            `json:"region"`
	Variable DatasetVariable   `json:"variable"`
	Series   []TimeSeriesPoint `json:"series"`
	Trend    *TrendResult      `json:"trend,omitempty"`
}

// SystemStatus health check response
type SystemStatus struct {
	Status    string    `json:"status"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	Platform  string    `json:"platform"`
	Mode      string    `json:"mode"`
}
