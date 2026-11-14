package data

import (
	"fmt"
	"math"
	"time"

	"github.com/pollo/backend/internal/data/catalog"
	"github.com/pollo/backend/internal/geospatial"
	"github.com/pollo/backend/internal/models"
)

// GenerateBenchmarkTimeSeries produces 25 years (2000-2024, 300 months) of physical observations.
// By default, it delegates to the 2D geospatial extraction pipeline with polygon masking and area weighting.
func GenerateBenchmarkTimeSeries(regionID, variableID string) ([]models.TimeSeriesPoint, error) {
	return ExtractRegionSpatialTimeSeries(regionID, variableID, geospatial.AggMean, true)
}

// GenerateBenchmarkTimeSeriesLegacy produces physical observations using the legacy 1D generator.
func GenerateBenchmarkTimeSeriesLegacy(regionID, variableID string) ([]models.TimeSeriesPoint, error) {
	reg, exists := GetRegion(regionID)
	if !exists {
		return nil, fmt.Errorf("region not found: %s", regionID)
	}
	v, exists := GetVariable(variableID)
	if !exists {
		return nil, fmt.Errorf("variable not found: %s", variableID)
	}

	startYear := 2000
	endYear := 2024
	totalMonths := (endYear - startYear + 1) * 12
	points := make([]models.TimeSeriesPoint, 0, totalMonths)

	for y := startYear; y <= endYear; y++ {
		for m := 1; m <= 12; m++ {
			dateStr := fmt.Sprintf("%04d-%02d", y, m)
			t := time.Date(y, time.Month(m), 15, 12, 0, 0, 0, time.UTC)
			monthIdx := (y-startYear)*12 + (m - 1)

			val := calculatePhysicalValue(reg.ID, v.ID, y, m, monthIdx)
			points = append(points, models.TimeSeriesPoint{
				Date:      dateStr,
				Timestamp: t.Unix(),
				Value:     math.Round(val*1000) / 1000,
			})
		}
	}

	return points, nil
}

func calculatePhysicalValue(regionID, variableID string, year, month, stepIndex int) float64 {
	// Deterministic pseudo-random variation based on stepIndex
	pseudoNoise := math.Sin(float64(stepIndex)*12.9898+float64(month)*78.233) * 43758.5453
	pseudoNoise = (pseudoNoise - math.Floor(pseudoNoise)) - 0.5 // range -0.5 .. +0.5

	// Year normalized: 0.0 at 2000 to 24.0 at 2024
	yrFrac := float64(year-2000) + float64(month-1)/12.0

	// Seasonal cycles (month 1 to 12)
	// Radians for annual 1-cycle: 2*pi*(month-1)/12
	mRad := 2.0 * math.Pi * float64(month-1) / 12.0
	// Radians for semi-annual (bimodal): 4*pi*(month-1)/12
	bimodalRad := 4.0 * math.Pi * float64(month-1) / 12.0

	switch regionID {
	case "lake_victoria_basin":
		switch variableID {
		case "GPM_PRECIP":
			// Bimodal rainfall: peaks in April (month 4) and Nov (month 11)
			base := 142.0
			season := 58.0*math.Sin(bimodalRad-0.8) + 24.0*math.Cos(mRad)
			trend := 0.72 * yrFrac // Wetting trend (~+0.72 mm/yr)
			noise := pseudoNoise * 22.0
			// 2019-2020 Indian Ocean Dipole surge
			extreme := 0.0
			if year == 2019 && month >= 10 {
				extreme = 65.0
			} else if year == 2020 && month <= 5 {
				extreme = 55.0
			}
			val := base + season + trend + noise + extreme
			if val < 10.0 {
				val = 10.0
			}
			return val

		case "MERRA2_T2M":
			// Warming trend +0.024 °C/yr (+0.24 °C/decade)
			base := 22.4
			season := -1.3 * math.Sin(mRad+0.5) // cooler in July/August
			trend := 0.024 * yrFrac
			noise := pseudoNoise * 0.45
			return base + season + trend + noise

		case "MODIS_LST":
			base := 28.2
			season := -2.1 * math.Sin(mRad+0.3)
			trend := 0.027 * yrFrac
			noise := pseudoNoise * 0.65
			return base + season + trend + noise

		case "SMAP_SOIL":
			base := 0.31
			season := 0.08 * math.Sin(bimodalRad-0.6)
			trend := 0.0009 * yrFrac
			noise := pseudoNoise * 0.03
			return base + season + trend + noise

		case "MERRA2_QV2M":
			base := 15.1
			season := 1.2 * math.Sin(mRad)
			trend := 0.018 * yrFrac
			noise := pseudoNoise * 0.4
			return base + season + trend + noise
		}

	case "horn_of_africa":
		switch variableID {
		case "GPM_PRECIP":
			// Arid, declining trend (-0.48 mm/yr)
			base := 38.0
			season := 30.0 * math.Sin(bimodalRad-1.2)
			trend := -0.48 * yrFrac // Drying trend
			noise := pseudoNoise * 14.0
			// Severe drought periods: 2010-2011, 2021-2022
			drought := 0.0
			if (year >= 2010 && year <= 2011) || (year >= 2021 && year <= 2022) {
				drought = -16.0
			}
			val := base + season + trend + noise + drought
			if val < 2.0 {
				val = 2.0
			}
			return val

		case "MERRA2_T2M":
			// Accelerated warming +0.036 °C/yr
			base := 28.3
			season := 2.5 * math.Sin(mRad)
			trend := 0.036 * yrFrac
			noise := pseudoNoise * 0.55
			return base + season + trend + noise

		case "MODIS_LST":
			base := 35.8
			season := 3.4 * math.Sin(mRad)
			trend := 0.041 * yrFrac
			noise := pseudoNoise * 0.8
			return base + season + trend + noise

		case "SMAP_SOIL":
			base := 0.14
			season := 0.05 * math.Sin(bimodalRad-1.2)
			trend := -0.0014 * yrFrac // Depleting soil moisture
			noise := pseudoNoise * 0.02
			val := base + season + trend + noise
			if val < 0.03 {
				val = 0.03
			}
			return val

		case "MERRA2_QV2M":
			base := 11.2
			season := 2.0 * math.Sin(mRad)
			trend := -0.012 * yrFrac
			noise := pseudoNoise * 0.4
			return base + season + trend + noise
		}

	case "congo_basin":
		switch variableID {
		case "GPM_PRECIP":
			base := 165.0
			season := 42.0 * math.Sin(bimodalRad)
			trend := -0.15 * yrFrac // slight neutral/stable
			noise := pseudoNoise * 20.0
			return base + season + trend + noise

		case "MERRA2_T2M":
			base := 24.8
			season := 0.9 * math.Sin(mRad)
			trend := 0.019 * yrFrac
			noise := pseudoNoise * 0.35
			return base + season + trend + noise

		case "MODIS_LST":
			base := 27.5
			season := 1.2 * math.Sin(mRad)
			trend := 0.021 * yrFrac
			noise := pseudoNoise * 0.5
			return base + season + trend + noise

		case "SMAP_SOIL":
			base := 0.38
			season := 0.04 * math.Sin(bimodalRad)
			trend := -0.0004 * yrFrac
			noise := pseudoNoise * 0.02
			return base + season + trend + noise

		case "MERRA2_QV2M":
			base := 17.5
			season := 1.1 * math.Sin(mRad)
			trend := 0.015 * yrFrac
			noise := pseudoNoise * 0.3
			return base + season + trend + noise
		}

	case "sahel_belt":
		switch variableID {
		case "GPM_PRECIP":
			// Unimodal West African Monsoon (July-Aug peaks)
			base := 45.0
			season := 85.0 * math.Sin(mRad-1.6) // Strong unimodal summer peak
			trend := 0.22 * yrFrac              // Slight re-greening recovery
			noise := pseudoNoise * 18.0
			val := base + season + trend + noise
			if val < 0.0 {
				val = 0.0
			}
			return val

		case "MERRA2_T2M":
			base := 29.5
			season := -4.2 * math.Cos(mRad) // hottest in April/May before rains
			trend := 0.031 * yrFrac
			noise := pseudoNoise * 0.6
			return base + season + trend + noise

		case "MODIS_LST":
			base := 38.0
			season := -5.5 * math.Cos(mRad)
			trend := 0.035 * yrFrac
			noise := pseudoNoise * 0.9
			return base + season + trend + noise

		case "SMAP_SOIL":
			base := 0.16
			season := 0.09 * math.Sin(mRad-1.6)
			trend := 0.0005 * yrFrac
			noise := pseudoNoise * 0.02
			val := base + season + trend + noise
			if val < 0.02 {
				val = 0.02
			}
			return val

		case "MERRA2_QV2M":
			base := 9.5
			season := 6.5 * math.Sin(mRad-1.6)
			trend := 0.015 * yrFrac
			noise := pseudoNoise * 0.4
			return base + season + trend + noise
		}
	}

	// Default fallback
	return 20.0 + 5.0*math.Sin(mRad) + pseudoNoise*2.0
}

// ExtractRegionSpatialTimeSeries produces 25 years (2000-2024, 300 months) of time-series observations
// by performing bounding box clipping, polygon masking, and spatial aggregation over 2D spatial raster grids.
func ExtractRegionSpatialTimeSeries(
	regionID, variableID string,
	aggType geospatial.AggregationType,
	weighted bool,
) ([]models.TimeSeriesPoint, error) {
	reg, exists := GetRegion(regionID)
	if !exists {
		return nil, fmt.Errorf("region not found: %s", regionID)
	}
	v, exists := GetVariable(variableID)
	if !exists {
		return nil, fmt.Errorf("variable not found: %s", variableID)
	}

	poly, exists := catalog.GetRegionPolygon(regionID)
	if !exists {
		ring := geospatial.Ring{
			{Lon: reg.BBox.MinLon, Lat: reg.BBox.MinLat},
			{Lon: reg.BBox.MaxLon, Lat: reg.BBox.MinLat},
			{Lon: reg.BBox.MaxLon, Lat: reg.BBox.MaxLat},
			{Lon: reg.BBox.MinLon, Lat: reg.BBox.MaxLat},
			{Lon: reg.BBox.MinLon, Lat: reg.BBox.MinLat},
		}
		var err error
		poly, err = geospatial.NewPolygon(ring)
		if err != nil {
			return nil, fmt.Errorf("failed to create fallback polygon: %w", err)
		}
	}

	res, err := geospatial.ParseResolution(v.SpatialResolution)
	if err != nil {
		return nil, fmt.Errorf("unsupported or invalid spatial resolution %q for variable %s: %w", v.SpatialResolution, v.ID, err)
	}

	stream, err := NewBenchmarkGridStream(v.ID, 2000, 2024, reg.BBox, res)
	if err != nil {
		return nil, fmt.Errorf("failed to create benchmark grid stream: %w", err)
	}

	opts := geospatial.AggregationOptions{Weighted: weighted, SampleVariance: true}
	return geospatial.ExtractStreamTimeSeries(stream, poly, aggType, opts)
}

// ExtractMultiRegionSpatialTimeSeries executes high-performance streaming extraction across multiple regions simultaneously.
func ExtractMultiRegionSpatialTimeSeries(
	regionIDs []string,
	variableID string,
	aggType geospatial.AggregationType,
	weighted bool,
) (map[string][]models.TimeSeriesPoint, error) {
	v, exists := GetVariable(variableID)
	if !exists {
		return nil, fmt.Errorf("variable not found: %s", variableID)
	}

	res, err := geospatial.ParseResolution(v.SpatialResolution)
	if err != nil {
		return nil, fmt.Errorf("unsupported or invalid spatial resolution %q for variable %s: %w", v.SpatialResolution, v.ID, err)
	}

	targets := make([]geospatial.RegionTarget, 0, len(regionIDs))
	var unionBBox models.BoundingBox
	hasBBox := false

	for _, id := range regionIDs {
		reg, exists := GetRegion(id)
		if !exists {
			return nil, fmt.Errorf("region not found: %s", id)
		}
		target, err := catalog.RegionToGeospatialTarget(*reg)
		if err != nil {
			return nil, err
		}
		targets = append(targets, target)

		if !hasBBox {
			unionBBox = reg.BBox
			hasBBox = true
		} else {
			unionBBox = geospatial.BoundingBoxUnion(unionBBox, reg.BBox)
		}
	}

	stream, err := NewBenchmarkGridStream(v.ID, 2000, 2024, unionBBox, res)
	if err != nil {
		return nil, err
	}

	opts := geospatial.AggregationOptions{Weighted: weighted, SampleVariance: true}
	return geospatial.ExtractStreamMultiRegionTimeSeries(stream, targets, aggType, opts)
}
