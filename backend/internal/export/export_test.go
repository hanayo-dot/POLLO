package export

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"strings"
	"testing"

	"github.com/pollo/backend/internal/models"
)

func mockRegion() *models.Region {
	return &models.Region{
		ID:            "lake_victoria_basin",
		Name:          "Lake Victoria Basin",
		Country:       "East Africa (Multi-national)",
		Jurisdictions: []string{"Uganda", "Kenya", "Tanzania", "Rwanda", "Burundi"},
		BBox: models.BoundingBox{
			MinLon: 29.0,
			MinLat: -4.5,
			MaxLon: 36.0,
			MaxLat: 2.5,
		},
		AreaSqKm:    251000,
		Description: "World's second largest freshwater lake.",
	}
}

func mockVariable() *models.DatasetVariable {
	return &models.DatasetVariable{
		ID:                 "GPM_PRECIP",
		Name:               "Precipitation Accumulation (IMERG V07)",
		Mission:            "Global Precipitation Measurement (GPM)",
		Instrument:         "GMI & DPR Multi-satellite Blend",
		ProducingOrg:       "NASA GSFC / JAXA",
		Units:              "mm/month",
		SpatialResolution:  "0.1° (~10 km)",
		TemporalResolution: "Monthly",
		Category:           "precipitation",
		BaselinePeriod:     "2000-2020",
		SupportedRegions:   []string{"lake_victoria_basin"},
	}
}

func mockTimeSeriesPoints() []models.TimeSeriesPoint {
	return []models.TimeSeriesPoint{
		{
			Date:           "2000-01",
			Timestamp:      947937600,
			Value:          135.25,
			Baseline:       130.00,
			Anomaly:        5.25,
			Deseasonalized: 132.10,
			StdAnomaly:     0.21,
		},
		{
			Date:           "2000-02",
			Timestamp:      950616000,
			Value:          110.50,
			Baseline:       112.00,
			Anomaly:        -1.50,
			Deseasonalized: 109.80,
			StdAnomaly:     -0.08,
		},
	}
}

func mockTrend() *models.TrendResult {
	return &models.TrendResult{
		VariableID:     "GPM_PRECIP",
		RegionID:       "lake_victoria_basin",
		DataPoints:     300,
		StartDate:      "2000-01",
		EndDate:        "2024-12",
		S:              11842,
		VarianceS:      2250000,
		Z:              4.18,
		PValue:         0.000029,
		Tau:            0.264,
		SensSlope:      0.060,
		AnnualRate:     0.720,
		Units:          "mm/month",
		Significance:   "significant",
		TrendDirection: "increasing",
		Interpretation: "Lake Victoria Basin exhibits an upward precipitation trend (+0.72 mm/yr, p <= 0.05).",
	}
}

func TestBuildTimeSeriesCSV(t *testing.T) {
	reg := mockRegion()
	v := mockVariable()
	points := mockTimeSeriesPoints()
	trend := mockTrend()

	data, err := BuildTimeSeriesCSV(reg, v, points, trend, true)
	if err != nil {
		t.Fatalf("BuildTimeSeriesCSV failed: %v", err)
	}

	content := string(data)

	// Check metadata header lines
	if !strings.Contains(content, "# Region: Lake Victoria Basin (ID: lake_victoria_basin)") {
		t.Errorf("missing region metadata in CSV header")
	}
	if !strings.Contains(content, "# Variable: Precipitation Accumulation (IMERG V07)") {
		t.Errorf("missing variable metadata in CSV header")
	}
	if !strings.Contains(content, "Mann-Kendall Trend: Z = +4.18") {
		t.Errorf("missing trend Z in CSV header")
	}
	if !strings.Contains(content, "Sen's Annual Rate: +0.7200 mm/month/year") {
		t.Errorf("missing annual rate in CSV header")
	}

	// Filter out comments to parse standard CSV
	lines := strings.Split(content, "\n")
	var csvLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" && !strings.HasPrefix(trimmed, "#") {
			csvLines = append(csvLines, line)
		}
	}

	reader := csv.NewReader(bytes.NewBufferString(strings.Join(csvLines, "\n")))
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("failed to parse CSV table: %v", err)
	}

	if len(records) != 3 { // 1 header + 2 rows
		t.Fatalf("expected 3 records, got %d", len(records))
	}

	expectedHeader := []string{"date", "timestamp", "value", "baseline", "anomaly", "deseasonalized", "std_anomaly"}
	for i, h := range expectedHeader {
		if records[0][i] != h {
			t.Errorf("header[%d] = %q, want %q", i, records[0][i], h)
		}
	}

	row1 := records[1]
	if row1[0] != "2000-01" || row1[1] != "947937600" || row1[2] != "135.250" {
		t.Errorf("unexpected row1 content: %v", row1)
	}
}

func TestBuildTimeSeriesJSON(t *testing.T) {
	reg := mockRegion()
	v := mockVariable()
	points := mockTimeSeriesPoints()
	trend := mockTrend()

	data, err := BuildTimeSeriesJSON(reg, v, points, trend, true)
	if err != nil {
		t.Fatalf("BuildTimeSeriesJSON failed: %v", err)
	}

	var parsed TimeSeriesExportJSON
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("unmarshal json export failed: %v", err)
	}

	if parsed.Region.ID != "lake_victoria_basin" {
		t.Errorf("parsed region ID = %q, want %q", parsed.Region.ID, "lake_victoria_basin")
	}
	if parsed.Variable.ID != "GPM_PRECIP" {
		t.Errorf("parsed variable ID = %q, want %q", parsed.Variable.ID, "GPM_PRECIP")
	}
	if parsed.DataPoints != 2 {
		t.Errorf("parsed data points = %d, want 2", parsed.DataPoints)
	}
	if parsed.Trend == nil || parsed.Trend.Z != 4.18 {
		t.Errorf("unexpected parsed trend: %+v", parsed.Trend)
	}
}

func TestBuildRegionGeoJSON(t *testing.T) {
	reg := mockRegion()
	data, err := BuildRegionGeoJSON(reg)
	if err != nil {
		t.Fatalf("BuildRegionGeoJSON failed: %v", err)
	}

	var feat GeoJSONFeature
	if err := json.Unmarshal(data, &feat); err != nil {
		t.Fatalf("unmarshal GeoJSON Feature failed: %v", err)
	}

	if feat.Type != "Feature" {
		t.Errorf("feat.Type = %q, want %q", feat.Type, "Feature")
	}
	if feat.ID != reg.ID {
		t.Errorf("feat.ID = %q, want %q", feat.ID, reg.ID)
	}
	if feat.Geometry.Type != "Polygon" {
		t.Errorf("geometry type = %q, want %q", feat.Geometry.Type, "Polygon")
	}

	coords := feat.Geometry.Coordinates
	if len(coords) != 1 || len(coords[0]) != 5 {
		t.Fatalf("expected 1 ring with 5 coordinates, got %d rings and %d points", len(coords), len(coords[0]))
	}

	// Verify closed ring: first == last
	first := coords[0][0]
	last := coords[0][4]
	if first[0] != last[0] || first[1] != last[1] {
		t.Errorf("polygon is not closed: first=%v, last=%v", first, last)
	}

	// Verify coordinates in RFC 7946 [lon, lat] order
	if first[0] != reg.BBox.MinLon || first[1] != reg.BBox.MinLat {
		t.Errorf("first coord = %v, want [%f, %f]", first, reg.BBox.MinLon, reg.BBox.MinLat)
	}

	// Verify properties
	if feat.Properties["id"] != reg.ID {
		t.Errorf("properties.id = %v, want %q", feat.Properties["id"], reg.ID)
	}
	if feat.Properties["area_sq_km"] != float64(reg.AreaSqKm) {
		t.Errorf("properties.area_sq_km = %v, want %f", feat.Properties["area_sq_km"], reg.AreaSqKm)
	}
}

func TestBuildGeometriesGeoJSON(t *testing.T) {
	r1 := *mockRegion()
	r2 := models.Region{
		ID:            "horn_of_africa",
		Name:          "Horn of Africa",
		Country:       "East Africa",
		Jurisdictions: []string{"Somalia", "Ethiopia", "Kenya"},
		BBox: models.BoundingBox{
			MinLon: 40.0,
			MinLat: 0.0,
			MaxLon: 51.5,
			MaxLat: 12.0,
		},
		AreaSqKm:    750000,
		Description: "Arid and semi-arid ecosystem.",
	}

	data, err := BuildGeometriesGeoJSON([]models.Region{r1, r2})
	if err != nil {
		t.Fatalf("BuildGeometriesGeoJSON failed: %v", err)
	}

	var fc GeoJSONFeatureCollection
	if err := json.Unmarshal(data, &fc); err != nil {
		t.Fatalf("unmarshal FeatureCollection failed: %v", err)
	}

	if fc.Type != "FeatureCollection" {
		t.Errorf("fc.Type = %q, want %q", fc.Type, "FeatureCollection")
	}
	if len(fc.Features) != 2 {
		t.Fatalf("expected 2 features, got %d", len(fc.Features))
	}
	if len(fc.BBox) != 4 {
		t.Fatalf("expected global bbox of length 4, got %d", len(fc.BBox))
	}
	if fc.BBox[0] != 29.0 || fc.BBox[2] != 51.5 {
		t.Errorf("global bbox bounds incorrect: %v", fc.BBox)
	}
}
