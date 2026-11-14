package data

import (
	"fmt"
	"math"
	"time"

	"github.com/pollo/backend/internal/geospatial"
	"github.com/pollo/backend/internal/models"
)

// GenerateBenchmarkGrid produces a realistic 2D spatial raster for a given variable, region bbox, and month.
func GenerateBenchmarkGrid(
	variableID string,
	year, month int,
	domainBBox models.BoundingBox,
	res geospatial.GridResolution,
) (*geospatial.SpatialGrid, error) {
	spec, err := geospatial.NewGridSpec(domainBBox, res)
	if err != nil {
		return nil, fmt.Errorf("failed creating grid spec: %w", err)
	}

	grid := geospatial.NewSpatialGrid(spec, math.NaN())

	// Temporal parameters
	startYear := 2000
	stepIndex := (year-startYear)*12 + (month - 1)
	yrFrac := float64(year-2000) + float64(month-1)/12.0
	mRad := 2.0 * math.Pi * float64(month-1) / 12.0
	bimodalRad := 4.0 * math.Pi * float64(month-1) / 12.0

	for r := 0; r < spec.Rows; r++ {
		for c := 0; c < spec.Cols; c++ {
			pt := spec.CellCenter(c, r)

			// High-frequency deterministic spatial noise based strictly on geographic coordinates and time
			spatialHash := math.Sin(pt.Lon*12.9898+pt.Lat*78.233+float64(stepIndex)*0.05) * 43758.5453
			spatialNoise := (spatialHash - math.Floor(spatialHash)) - 0.5 // range [-0.5, 0.5]

			val := computeSpatialValue(variableID, yrFrac, mRad, bimodalRad, pt.Lon, pt.Lat, spatialNoise, year, month)
			grid.Set(c, r, val)
		}
	}

	return grid, nil
}

func computeSpatialValue(
	variableID string,
	yrFrac, mRad, bimodalRad float64,
	lon, lat, noise float64,
	year, month int,
) float64 {
	distEquator := math.Abs(lat)
	relLon := lon - 30.0 // Relative to continental reference meridian 30.0°E

	switch variableID {
	case "GPM_PRECIP":
		// Precipitation: equatorial convective regime (peaks near equator, modulated by bimodal monsoon)
		base := 130.0 - 8.0*distEquator + 0.8*relLon
		season := 45.0*math.Sin(bimodalRad-0.8) + 18.0*math.Cos(mRad)
		trend := 0.65 * yrFrac
		// Extreme surge
		extreme := 0.0
		if year == 2019 && month >= 10 {
			extreme = 50.0
		} else if year == 2020 && month <= 5 {
			extreme = 40.0
		}
		val := base + season + trend + noise*15.0 + extreme
		if val < 0.0 {
			val = 0.0
		}
		return val

	case "MERRA2_T2M":
		// Surface Air Temperature: tropical warm pool with poleward lapse rate
		base := 26.5 - 0.45*distEquator - 0.05*relLon
		season := -1.8 * math.Sin(mRad+0.5)
		trend := 0.028 * yrFrac
		return base + season + trend + noise*0.4

	case "MODIS_LST":
		// Land Surface Temperature: stronger amplitude and diurnal skin heating
		base := 32.0 - 0.6*distEquator - 0.08*relLon
		season := -3.0 * math.Sin(mRad+0.3)
		trend := 0.032 * yrFrac
		return base + season + trend + noise*0.6

	case "SMAP_SOIL":
		// Soil Moisture: peaks with equatorial rainfall, lower in arid zones
		base := 0.32 - 0.02*distEquator + 0.005*math.Cos(relLon*0.1)
		season := 0.06 * math.Sin(bimodalRad-0.6)
		trend := 0.0007 * yrFrac
		val := base + season + trend + noise*0.025
		if val < 0.02 {
			val = 0.02
		}
		return val

	case "MERRA2_QV2M":
		// Specific Humidity: high near equator, decreasing poleward
		base := 15.2 - 0.35*distEquator + 0.04*relLon
		season := 1.5 * math.Sin(mRad)
		trend := 0.016 * yrFrac
		return base + season + trend + noise*0.35

	default:
		// Default generic Earth observation field
		return 20.0 - 0.3*distEquator + 5.0*math.Sin(mRad) + noise*2.0
	}
}

// BenchmarkGridStream implements geospatial.GridProvider for streaming 25-year monthly grids.
type BenchmarkGridStream struct {
	variableID string
	startYear  int
	endYear    int
	domainBBox models.BoundingBox
	resolution geospatial.GridResolution
	currMonth  int
	totalSteps int
}

// NewBenchmarkGridStream initializes a streaming provider for 25 years (2000-2024, 300 months).
func NewBenchmarkGridStream(
	variableID string,
	startYear, endYear int,
	domainBBox models.BoundingBox,
	res geospatial.GridResolution,
) (*BenchmarkGridStream, error) {
	if startYear > endYear {
		return nil, fmt.Errorf("startYear (%d) > endYear (%d)", startYear, endYear)
	}
	totalSteps := (endYear - startYear + 1) * 12
	return &BenchmarkGridStream{
		variableID: variableID,
		startYear:  startYear,
		endYear:    endYear,
		domainBBox: domainBBox,
		resolution: res,
		currMonth:  0,
		totalSteps: totalSteps,
	}, nil
}

// Next yields the next sequential TemporalGrid.
func (s *BenchmarkGridStream) Next() (*geospatial.TemporalGrid, error) {
	if s.currMonth >= s.totalSteps {
		return nil, nil // EOF
	}

	year := s.startYear + (s.currMonth / 12)
	month := (s.currMonth % 12) + 1
	dateStr := fmt.Sprintf("%04d-%02d", year, month)
	t := time.Date(year, time.Month(month), 15, 12, 0, 0, 0, time.UTC)

	grid, err := GenerateBenchmarkGrid(s.variableID, year, month, s.domainBBox, s.resolution)
	if err != nil {
		return nil, err
	}

	s.currMonth++
	return &geospatial.TemporalGrid{
		Date:      dateStr,
		Timestamp: t.Unix(),
		Grid:      grid,
	}, nil
}

// Reset rewinds the stream to the beginning.
func (s *BenchmarkGridStream) Reset() error {
	s.currMonth = 0
	return nil
}

// TotalSteps returns the total number of monthly time steps in the stream.
func (s *BenchmarkGridStream) TotalSteps() int {
	return s.totalSteps
}
