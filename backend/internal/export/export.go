package export

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/pollo/backend/internal/models"
)

// GeoJSONFeature represents an RFC 7946 GeoJSON Feature.
type GeoJSONFeature struct {
	Type       string                 `json:"type"`
	ID         string                 `json:"id,omitempty"`
	BBox       []float64              `json:"bbox,omitempty"`
	Geometry   GeoJSONGeometry        `json:"geometry"`
	Properties map[string]interface{} `json:"properties"`
}

// GeoJSONGeometry represents an RFC 7946 Polygon geometry.
type GeoJSONGeometry struct {
	Type        string        `json:"type"`
	Coordinates [][][]float64 `json:"coordinates"`
}

// GeoJSONFeatureCollection represents an RFC 7946 GeoJSON FeatureCollection.
type GeoJSONFeatureCollection struct {
	Type     string           `json:"type"`
	Features []GeoJSONFeature `json:"features"`
	BBox     []float64        `json:"bbox,omitempty"`
}

// TimeSeriesExportJSON represents structured JSON export format.
type TimeSeriesExportJSON struct {
	ExportedAt     string                   `json:"exported_at"`
	Platform       string                   `json:"platform"`
	Region         models.Region            `json:"region"`
	Variable       models.DatasetVariable   `json:"variable"`
	Deseasonalized bool                     `json:"deseasonalized"`
	Trend          *models.TrendResult      `json:"trend,omitempty"`
	DataPoints     int                      `json:"data_points"`
	Series         []models.TimeSeriesPoint `json:"series"`
}

// BuildTimeSeriesCSV generates clean tabular CSV with metadata comments.
func BuildTimeSeriesCSV(
	reg *models.Region,
	v *models.DatasetVariable,
	points []models.TimeSeriesPoint,
	trend *models.TrendResult,
	deseasonalized bool,
) ([]byte, error) {
	var buf bytes.Buffer

	// Metadata comments block
	buf.WriteString("# ==============================================================================\n")
	buf.WriteString("# POLLO Earth System Intelligence — Planetary Time Series Data Export\n")
	buf.WriteString(fmt.Sprintf("# Exported At: %s\n", time.Now().UTC().Format(time.RFC3339)))
	if reg != nil {
		buf.WriteString(fmt.Sprintf("# Region: %s (ID: %s)\n", reg.Name, reg.ID))
		buf.WriteString(fmt.Sprintf("# Country / Catchment: %s\n", reg.Country))
		buf.WriteString(fmt.Sprintf("# Jurisdictions: %s\n", strings.Join(reg.Jurisdictions, ", ")))
		buf.WriteString(fmt.Sprintf("# Area: %.0f sq km\n", reg.AreaSqKm))
		buf.WriteString(fmt.Sprintf("# Bounding Box (WGS84): [%.4f, %.4f, %.4f, %.4f]\n",
			reg.BBox.MinLon, reg.BBox.MinLat, reg.BBox.MaxLon, reg.BBox.MaxLat))
	}
	if v != nil {
		buf.WriteString(fmt.Sprintf("# Variable: %s (ID: %s)\n", v.Name, v.ID))
		buf.WriteString(fmt.Sprintf("# Mission: %s | Instrument: %s\n", v.Mission, v.Instrument))
		buf.WriteString(fmt.Sprintf("# Producing Organization: %s\n", v.ProducingOrg))
		buf.WriteString(fmt.Sprintf("# Units: %s | Spatial Resolution: %s\n", v.Units, v.SpatialResolution))
		buf.WriteString(fmt.Sprintf("# Climatological Baseline Period: %s\n", v.BaselinePeriod))
	}
	buf.WriteString(fmt.Sprintf("# Deseasonalized: %t\n", deseasonalized))

	if trend != nil {
		buf.WriteString(fmt.Sprintf("# Mann-Kendall Trend: Z = %+.2f, p-value = %.6f, S = %.0f, Tau = %+.3f\n",
			trend.Z, trend.PValue, trend.S, trend.Tau))
		buf.WriteString(fmt.Sprintf("# Sen's Slope (Monthly Rate): %+.4f %s/month\n", trend.SensSlope, trend.Units))
		buf.WriteString(fmt.Sprintf("# Sen's Annual Rate: %+.4f %s/year\n", trend.AnnualRate, trend.Units))
		buf.WriteString(fmt.Sprintf("# Significance: %s | Trend Direction: %s\n", trend.Significance, trend.TrendDirection))
		buf.WriteString(fmt.Sprintf("# Interpretation: %s\n", trend.Interpretation))
	}
	buf.WriteString("# ==============================================================================\n")

	// Standard CSV Table
	w := csv.NewWriter(&buf)
	header := []string{"date", "timestamp", "value", "baseline", "anomaly", "deseasonalized", "std_anomaly"}
	if err := w.Write(header); err != nil {
		return nil, fmt.Errorf("write csv header: %w", err)
	}

	for _, p := range points {
		row := []string{
			p.Date,
			strconv.FormatInt(p.Timestamp, 10),
			strconv.FormatFloat(p.Value, 'f', 3, 64),
			formatOptionalFloat(p.Baseline),
			formatOptionalFloat(p.Anomaly),
			formatOptionalFloat(p.Deseasonalized),
			formatOptionalFloat(p.StdAnomaly),
		}
		if err := w.Write(row); err != nil {
			return nil, fmt.Errorf("write csv row: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("flush csv: %w", err)
	}

	return buf.Bytes(), nil
}

// BuildTimeSeriesJSON generates structured JSON export payload.
func BuildTimeSeriesJSON(
	reg *models.Region,
	v *models.DatasetVariable,
	points []models.TimeSeriesPoint,
	trend *models.TrendResult,
	deseasonalized bool,
) ([]byte, error) {
	out := TimeSeriesExportJSON{
		ExportedAt:     time.Now().UTC().Format(time.RFC3339),
		Platform:       "POLLO Planetary Intelligence Platform",
		Deseasonalized: deseasonalized,
		Trend:          trend,
		DataPoints:     len(points),
		Series:         points,
	}
	if reg != nil {
		out.Region = *reg
	}
	if v != nil {
		out.Variable = *v
	}
	return json.MarshalIndent(out, "", "  ")
}

// BuildRegionGeoJSON constructs an RFC 7946 GeoJSON Feature for a single region.
func BuildRegionGeoJSON(reg *models.Region) ([]byte, error) {
	if reg == nil {
		return nil, fmt.Errorf("region cannot be nil")
	}
	feat := regionToFeature(*reg)
	return json.MarshalIndent(feat, "", "  ")
}

// BuildGeometriesGeoJSON constructs an RFC 7946 GeoJSON FeatureCollection for multiple regions.
func BuildGeometriesGeoJSON(regions []models.Region) ([]byte, error) {
	features := make([]GeoJSONFeature, 0, len(regions))
	var globalMinLon, globalMinLat, globalMaxLon, globalMaxLat float64
	if len(regions) > 0 {
		globalMinLon = regions[0].BBox.MinLon
		globalMinLat = regions[0].BBox.MinLat
		globalMaxLon = regions[0].BBox.MaxLon
		globalMaxLat = regions[0].BBox.MaxLat
	}

	for _, reg := range regions {
		feat := regionToFeature(reg)
		features = append(features, feat)

		globalMinLon = math.Min(globalMinLon, reg.BBox.MinLon)
		globalMinLat = math.Min(globalMinLat, reg.BBox.MinLat)
		globalMaxLon = math.Max(globalMaxLon, reg.BBox.MaxLon)
		globalMaxLat = math.Max(globalMaxLat, reg.BBox.MaxLat)
	}

	fc := GeoJSONFeatureCollection{
		Type:     "FeatureCollection",
		Features: features,
	}
	if len(regions) > 0 {
		fc.BBox = []float64{globalMinLon, globalMinLat, globalMaxLon, globalMaxLat}
	}

	return json.MarshalIndent(fc, "", "  ")
}

func regionToFeature(reg models.Region) GeoJSONFeature {
	// RFC 7946: Polygon coordinates [longitude, latitude] in counterclockwise closed ring.
	coords := [][][]float64{
		{
			{reg.BBox.MinLon, reg.BBox.MinLat},
			{reg.BBox.MaxLon, reg.BBox.MinLat},
			{reg.BBox.MaxLon, reg.BBox.MaxLat},
			{reg.BBox.MinLon, reg.BBox.MaxLat},
			{reg.BBox.MinLon, reg.BBox.MinLat}, // closed loop
		},
	}

	bbox := []float64{reg.BBox.MinLon, reg.BBox.MinLat, reg.BBox.MaxLon, reg.BBox.MaxLat}

	props := map[string]interface{}{
		"id":            reg.ID,
		"name":          reg.Name,
		"country":       reg.Country,
		"jurisdictions": reg.Jurisdictions,
		"area_sq_km":    reg.AreaSqKm,
		"description":   reg.Description,
		"bbox":          bbox,
	}

	return GeoJSONFeature{
		Type: "Feature",
		ID:   reg.ID,
		BBox: bbox,
		Geometry: GeoJSONGeometry{
			Type:        "Polygon",
			Coordinates: coords,
		},
		Properties: props,
	}
}

func formatOptionalFloat(v float64) string {
	if v == 0 {
		return "0.000"
	}
	return strconv.FormatFloat(v, 'f', 3, 64)
}
