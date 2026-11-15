package observations

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pollo/backend/internal/models"
	"github.com/pollo/backend/internal/trendx"
)

type Client struct {
	HTTP                 *http.Client
	WeatherURL, MODISURL string
	mu                   sync.Mutex
	cache                map[string]cached
}
type cached struct {
	response models.TimeSeriesResponse
	until    time.Time
}

func NewClient() *Client {
	return &Client{HTTP: &http.Client{Timeout: 40 * time.Second}, WeatherURL: "https://archive-api.open-meteo.com/v1/archive", MODISURL: "https://modis.ornl.gov/rst/api/v1/MOD13Q1", cache: make(map[string]cached)}
}

func Variables() []models.DatasetVariable {
	makeVar := func(id, name, units, category, mission, resolution string) models.DatasetVariable {
		return models.DatasetVariable{ID: id, Name: name, Units: units, Category: category, Mission: mission, Instrument: "Gridded historical data", ProducingOrg: "ECMWF / Copernicus via Open-Meteo", SpatialResolution: resolution, TemporalResolution: "Monthly", BaselinePeriod: "1950-present", SupportedRegions: []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"}}
	}
	result := []models.DatasetVariable{
		makeVar("ERA5_TEMP", "2-metre air temperature", "°C", "atmosphere", "ERA5-Land", "0.1°"),
		makeVar("ERA5_RAIN", "Rainfall (liquid precipitation)", "mm/month", "precipitation", "ERA5", "0.25°"),
		makeVar("ERA5_SOIL", "Surface soil moisture (0–7 cm)", "m³/m³", "land", "ERA5-Land", "0.1°"),
		makeVar("MODIS_NDVI", "Vegetation NDVI", "NDVI", "vegetation", "Terra MODIS MOD13Q1", "250 m"),
	}
	result[3].ProducingOrg = "NASA LP DAAC / ORNL DAAC"
	result[3].Instrument = "MODIS"
	result[3].BaselinePeriod = "2000-present"
	return result
}

func (c *Client) get(ctx context.Context, endpoint string, params url.Values, target any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"?"+params.Encode(), nil)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "POLLO/1.0 climate analysis")
	response, err := c.HTTP.Do(request)
	if err != nil {
		return fmt.Errorf("data provider is unreachable: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("data provider returned HTTP %d; try another period or retry later", response.StatusCode)
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 24<<20)).Decode(target); err != nil {
		return fmt.Errorf("invalid data-provider response: %w", err)
	}
	return nil
}

func month(value string) (time.Time, error) {
	t, err := time.Parse("2006-01", value)
	if err != nil {
		return t, fmt.Errorf("dates must use YYYY-MM")
	}
	return t, nil
}
func Validate(lat, lon float64, start, end string) (time.Time, time.Time, error) {
	if math.IsNaN(lat) || math.IsNaN(lon) || math.IsInf(lat, 0) || math.IsInf(lon, 0) || lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		return time.Time{}, time.Time{}, fmt.Errorf("latitude must be -90 to 90 and longitude -180 to 180")
	}
	a, err := month(start)
	if err != nil {
		return a, a, err
	}
	b, err := month(end)
	if err != nil {
		return a, b, err
	}
	if a.After(b) || a.Year() < 1950 || b.After(time.Now().UTC().AddDate(0, 0, -7)) {
		return a, b, fmt.Errorf("choose a period from 1950 through the latest completed historical months, with start before end")
	}
	// Only completed months are analysed, avoiding partial monthly totals.
	if !b.AddDate(0, 1, 0).AddDate(0, 0, -1).Before(time.Now().UTC().AddDate(0, 0, -5)) {
		return a, b, fmt.Errorf("the final month must be complete and at least five days old")
	}
	return a, b, nil
}

func (c *Client) Series(ctx context.Context, lat, lon float64, name, variableID, start, end string) (models.TimeSeriesResponse, error) {
	a, b, err := Validate(lat, lon, start, end)
	if err != nil {
		return models.TimeSeriesResponse{}, err
	}
	var variable models.DatasetVariable
	for _, v := range Variables() {
		if v.ID == variableID {
			variable = v
		}
	}
	if variable.ID == "" {
		return models.TimeSeriesResponse{}, fmt.Errorf("unsupported observational dataset")
	}
	key := fmt.Sprintf("%.6f:%.6f:%s:%s:%s", lat, lon, variableID, start, end)
	c.mu.Lock()
	item, ok := c.cache[key]
	c.mu.Unlock()
	if ok && time.Now().Before(item.until) {
		response := item.response
		response.Region.Name = name
		return response, nil
	}
	var points []models.TimeSeriesPoint
	var source models.DataSource
	if variableID == "MODIS_NDVI" {
		points, source, err = c.vegetation(ctx, lat, lon, a, b)
	} else {
		points, source, err = c.weather(ctx, lat, lon, variableID, a, b)
	}
	if err != nil {
		return models.TimeSeriesResponse{}, err
	}
	if len(points) == 0 {
		return models.TimeSeriesResponse{}, fmt.Errorf("no valid measurements for this location and period; land datasets may not cover ocean or ice")
	}
	source.RetrievedAt = time.Now().UTC().Format(time.RFC3339)
	source.MissingMonths = (b.Year()-a.Year())*12 + int(b.Month()-a.Month()) + 1 - len(points)
	if name == "" {
		name = fmt.Sprintf("%.4f, %.4f", lat, lon)
	}
	region := models.Region{ID: fmt.Sprintf("geo:%.6f:%.6f", lat, lon), Name: name, Latitude: &lat, Longitude: &lon, Country: "", Jurisdictions: []string{}, BBox: models.BoundingBox{MinLon: lon, MaxLon: lon, MinLat: lat, MaxLat: lat}, Description: "Gridded data at the selected coordinate; not an area average"}
	result := models.TimeSeriesResponse{Region: region, Variable: variable, Series: points, Source: &source}
	result.Trend = analyse(points, region.ID, variable)
	c.mu.Lock()
	if len(c.cache) >= 128 {
		c.cache = make(map[string]cached)
	}
	c.cache[key] = cached{result, time.Now().Add(24 * time.Hour)}
	c.mu.Unlock()
	return result, nil
}

func (c *Client) weather(ctx context.Context, lat, lon float64, id string, a, b time.Time) ([]models.TimeSeriesPoint, models.DataSource, error) {
	field, model := "temperature_2m_mean", "era5_land"
	if id == "ERA5_RAIN" {
		field, model = "rain_sum", "era5"
	}
	if id == "ERA5_SOIL" {
		field = "soil_moisture_0_to_7cm_mean"
	}
	params := url.Values{"latitude": {strconv.FormatFloat(lat, 'f', 6, 64)}, "longitude": {strconv.FormatFloat(lon, 'f', 6, 64)}, "start_date": {a.Format("2006-01-02")}, "end_date": {b.AddDate(0, 1, -1).Format("2006-01-02")}, "daily": {field}, "models": {model}, "timezone": {"GMT"}}
	var payload struct {
		Daily map[string]json.RawMessage `json:"daily"`
	}
	source := models.DataSource{Name: strings.ToUpper(strings.ReplaceAll(model, "_", "-")) + " via Open-Meteo", Kind: "reanalysis", URL: "https://open-meteo.com/en/docs/historical-weather-api", Description: "Modelled reanalysis at the selected grid cell, not direct station observations. Monthly means of daily values; rainfall is summed. Incomplete months are excluded. Soil moisture is for 0–7 cm depth."}
	if err := c.get(ctx, c.WeatherURL, params, &payload); err != nil {
		return nil, source, err
	}
	var dates []string
	var values []*float64
	if err := json.Unmarshal(payload.Daily["time"], &dates); err != nil {
		return nil, source, fmt.Errorf("missing daily dates")
	}
	if err := json.Unmarshal(payload.Daily[field], &values); err != nil {
		return nil, source, fmt.Errorf("missing daily measurements")
	}
	return aggregateDaily(dates, values, id == "ERA5_RAIN"), source, nil
}

func aggregateDaily(dates []string, values []*float64, total bool) []models.TimeSeriesPoint {
	type bucket struct {
		sum   float64
		count int
		days  map[string]bool
	}
	buckets := map[string]*bucket{}
	for i, date := range dates {
		if i >= len(values) || values[i] == nil || math.IsNaN(*values[i]) || math.IsInf(*values[i], 0) {
			continue
		}
		t, err := time.Parse("2006-01-02", date)
		if err != nil {
			continue
		}
		key := t.Format("2006-01")
		if buckets[key] == nil {
			buckets[key] = &bucket{days: map[string]bool{}}
		}
		v := buckets[key]
		if v.days[date] {
			continue
		}
		v.days[date] = true
		v.sum += *values[i]
		v.count++
	}
	keys := []string{}
	for key := range buckets {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	points := []models.TimeSeriesPoint{}
	for _, key := range keys {
		t, _ := month(key)
		v := buckets[key]
		days := t.AddDate(0, 1, -1).Day()
		if v.count != days {
			continue
		}
		value := v.sum
		if !total {
			value /= float64(v.count)
		}
		points = append(points, models.TimeSeriesPoint{Date: key, Timestamp: t.Unix(), Value: value})
	}
	return points
}

type modisDate struct {
	Modis    string `json:"modis_date"`
	Calendar string `json:"calendar_date"`
}
type modisSubset struct {
	Date string     `json:"calendar_date"`
	Data []*float64 `json:"data"`
}
type modisResponse struct {
	Subset []modisSubset `json:"subset"`
}

func (c *Client) vegetation(ctx context.Context, lat, lon float64, a, b time.Time) ([]models.TimeSeriesPoint, models.DataSource, error) {
	source := models.DataSource{Name: "NASA MOD13Q1 NDVI via ORNL DAAC", Kind: "satellite", URL: "https://modis.ornl.gov/data/modis_webservice.html", Description: "250 m land-pixel NDVI, scaled by 0.0001; only good-quality (pixel reliability 0) 16-day composites retained. Monthly means require at least one good composite. Missing months are omitted; trend slopes use elapsed calendar months."}
	p := url.Values{"latitude": {strconv.FormatFloat(lat, 'f', 6, 64)}, "longitude": {strconv.FormatFloat(lon, 'f', 6, 64)}}
	var dates struct {
		Dates []modisDate `json:"dates"`
	}
	if err := c.get(ctx, c.MODISURL+"/dates", p, &dates); err != nil {
		return nil, source, fmt.Errorf("vegetation service unavailable: %w", err)
	}
	selected := []modisDate{}
	for _, date := range dates.Dates {
		if date.Calendar >= a.Format("2006-01-02") && date.Calendar <= b.AddDate(0, 1, -1).Format("2006-01-02") {
			selected = append(selected, date)
		}
	}
	sort.Slice(selected, func(i, j int) bool { return selected[i].Calendar < selected[j].Calendar })
	sums := map[string]float64{}
	counts := map[string]int{}
	// ORNL limits each subset request to ten dates. Sequential requests respect
	// the public service; callers can cancel and successful ranges are cached.
	for from := 0; from < len(selected); from += 10 {
		to := from + 10
		if to > len(selected) {
			to = len(selected)
		}
		params := url.Values{}
		for k, v := range p {
			params[k] = v
		}
		params.Set("startDate", selected[from].Modis)
		params.Set("endDate", selected[to-1].Modis)
		params.Set("kmAboveBelow", "0")
		params.Set("kmLeftRight", "0")
		params.Set("band", "250m_16_days_NDVI")
		var ndvi modisResponse
		if err := c.get(ctx, c.MODISURL+"/subset", params, &ndvi); err != nil {
			return nil, source, fmt.Errorf("vegetation NDVI unavailable: %w", err)
		}
		params.Set("band", "250m_16_days_pixel_reliability")
		var quality modisResponse
		if err := c.get(ctx, c.MODISURL+"/subset", params, &quality); err != nil {
			return nil, source, fmt.Errorf("vegetation quality data unavailable: %w", err)
		}
		flags := map[string][]*float64{}
		for _, row := range quality.Subset {
			flags[row.Date] = row.Data
		}
		for _, row := range ndvi.Subset {
			if len(row.Date) < 7 {
				continue
			}
			key := row.Date[:7]
			for i, value := range row.Data {
				qa := flags[row.Date]
				if value == nil || i >= len(qa) || qa[i] == nil || *qa[i] != 0 || *value < -2000 || *value > 10000 {
					continue
				}
				sums[key] += *value * 0.0001
				counts[key]++
			}
		}
	}
	keys := []string{}
	for key := range counts {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	points := []models.TimeSeriesPoint{}
	for _, key := range keys {
		t, err := month(key)
		if err == nil {
			points = append(points, models.TimeSeriesPoint{Date: key, Timestamp: t.Unix(), Value: sums[key] / float64(counts[key])})
		}
	}
	return points, source, nil
}

func analyse(points []models.TimeSeriesPoint, region string, variable models.DatasetVariable) *models.TrendResult {
	if len(points) < 4 {
		return nil
	}
	values := make([]float64, len(points))
	months := make([]int, len(points))
	for i, p := range points {
		values[i] = p.Value
		t, _ := month(p.Date)
		months[i] = t.Year()*12 + int(t.Month())
	}
	mk, err := trendx.MannKendall(values)
	if err != nil {
		return nil
	}
	slopes := []float64{}
	for i := 0; i < len(values)-1; i++ {
		for j := i + 1; j < len(values); j++ {
			if months[j] > months[i] {
				slopes = append(slopes, (values[j]-values[i])/float64(months[j]-months[i]))
			}
		}
	}
	if len(slopes) == 0 {
		return nil
	}
	sort.Float64s(slopes)
	mid := len(slopes) / 2
	slope := slopes[mid]
	if len(slopes)%2 == 0 {
		slope = (slopes[mid-1] + slopes[mid]) / 2
	}
	return &models.TrendResult{VariableID: variable.ID, RegionID: region, DataPoints: len(points), StartDate: points[0].Date, EndDate: points[len(points)-1].Date, S: mk.S, VarianceS: mk.VarianceS, Z: mk.Z, PValue: mk.PValue, Tau: mk.Tau, SensSlope: slope, AnnualRate: slope * 12, Units: variable.Units, Significance: mk.Significance, TrendDirection: mk.TrendDirection, Interpretation: fmt.Sprintf("%s trend; %+.5g %s/year. Raw monthly Mann–Kendall p=%.5g; not corrected for seasonality or serial correlation.", mk.TrendDirection, slope*12, variable.Units, mk.PValue)}
}
