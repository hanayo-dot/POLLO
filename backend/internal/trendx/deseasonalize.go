package trendx

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/pollo/backend/internal/models"
)

// MonthStat holds climatological baseline statistics for a calendar month
type MonthStat struct {
	Count  int
	Sum    float64
	Mean   float64
	StdDev float64
}

// DeseasonalizeTimeSeries calculates monthly climatologies and computes deseasonalized points
func DeseasonalizeTimeSeries(points []models.TimeSeriesPoint) ([]models.TimeSeriesPoint, map[int]MonthStat, error) {
	if len(points) == 0 {
		return nil, nil, fmt.Errorf("empty time series points")
	}

	// 1. Accumulate values by calendar month (1..12)
	monthlyValues := make(map[int][]float64)
	for _, p := range points {
		month, err := extractMonth(p.Date)
		if err != nil {
			return nil, nil, err
		}
		monthlyValues[month] = append(monthlyValues[month], p.Value)
	}

	// 2. Compute mean and standard deviation for each month
	monthStats := make(map[int]MonthStat)
	for m := 1; m <= 12; m++ {
		vals := monthlyValues[m]
		if len(vals) == 0 {
			continue
		}
		var sum float64
		for _, v := range vals {
			sum += v
		}
		mean := sum / float64(len(vals))

		var varianceSum float64
		for _, v := range vals {
			varianceSum += (v - mean) * (v - mean)
		}
		stdDev := 0.0
		if len(vals) > 1 {
			stdDev = math.Sqrt(varianceSum / float64(len(vals)-1))
		}

		monthStats[m] = MonthStat{
			Count:  len(vals),
			Sum:    sum,
			Mean:   mean,
			StdDev: stdDev,
		}
	}

	// 3. Transform points with deseasonalized values and standardized anomalies
	result := make([]models.TimeSeriesPoint, len(points))
	for i, p := range points {
		month, _ := extractMonth(p.Date)
		stat := monthStats[month]

		anomaly := p.Value - stat.Mean
		stdAnomaly := 0.0
		if stat.StdDev > 1e-9 {
			stdAnomaly = anomaly / stat.StdDev
		}

		result[i] = models.TimeSeriesPoint{
			Date:           p.Date,
			Timestamp:      p.Timestamp,
			Value:          p.Value,
			Baseline:       stat.Mean,
			Anomaly:        anomaly,
			Deseasonalized: anomaly, // centered anomaly
			StdAnomaly:     stdAnomaly,
		}
	}

	return result, monthStats, nil
}

func extractMonth(dateStr string) (int, error) {
	// Date formats: "2000-01" or "2000-01-15"
	parts := strings.Split(dateStr, "-")
	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid date format: %s", dateStr)
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil || m < 1 || m > 12 {
		return 0, fmt.Errorf("invalid month in date: %s", dateStr)
	}
	return m, nil
}
