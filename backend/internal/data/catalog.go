package data

import "github.com/pollo/backend/internal/models"

// AvailableRegions returns catalog of demonstration and reference regions
func AvailableRegions() []models.Region {
	return []models.Region{
		{
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
			Description: "World's second largest freshwater lake, critical economic hub for 45M people, experiencing severe bimodal rainfall shifts and convective precipitation anomalies.",
		},
		{
			ID:            "horn_of_africa",
			Name:          "Horn of Africa (Somalia/Ogaden)",
			Country:       "East Africa",
			Jurisdictions: []string{"Somalia", "Ethiopia", "Kenya"},
			BBox: models.BoundingBox{
				MinLon: 40.0,
				MinLat: 0.0,
				MaxLon: 51.5,
				MaxLat: 12.0,
			},
			AreaSqKm:    750000,
			Description: "Arid and semi-arid ecosystem prone to multi-year consecutive rainy season failures and acute desertification risks.",
		},
		{
			ID:            "congo_basin",
			Name:          "Congo Rainforest Basin",
			Country:       "Central Africa",
			Jurisdictions: []string{"Democratic Republic of Congo", "Republic of Congo", "Gabon", "Cameroon"},
			BBox: models.BoundingBox{
				MinLon: 14.0,
				MinLat: -5.0,
				MaxLon: 29.0,
				MaxLat: 5.0,
			},
			AreaSqKm:    3700000,
			Description: "World's second largest contiguous tropical rainforest, vital global carbon sink and atmospheric moisture pump.",
		},
		{
			ID:            "sahel_belt",
			Name:          "Sudano-Sahel Transition Belt",
			Country:       "West-Central Africa",
			Jurisdictions: []string{"Chad", "Niger", "Sudan", "Mali"},
			BBox: models.BoundingBox{
				MinLon: -5.0,
				MinLat: 11.0,
				MaxLon: 25.0,
				MaxLat: 18.0,
			},
			AreaSqKm:    1800000,
			Description: "Dynamic ecological ecotone between the hyper-arid Sahara and humid savannahs, highly sensitive to Green Sahara shifts.",
		},
	}
}

// AvailableVariables returns catalog of NASA Earth observation datasets
func AvailableVariables() []models.DatasetVariable {
	return []models.DatasetVariable{
		{
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
			SupportedRegions:   []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"},
		},
		{
			ID:                 "MERRA2_T2M",
			Name:               "2-Meter Surface Air Temperature",
			Mission:            "MERRA-2 Reanalysis",
			Instrument:         "Atmospheric Data Assimilation System (ADAS)",
			ProducingOrg:       "NASA GMAO",
			Units:              "°C",
			SpatialResolution:  "0.5° × 0.625°",
			TemporalResolution: "Monthly Mean",
			Category:           "atmosphere",
			BaselinePeriod:     "2000-2020",
			SupportedRegions:   []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"},
		},
		{
			ID:                 "MODIS_LST",
			Name:               "Daytime Land Surface Temperature",
			Mission:            "Terra / Aqua MODIS (MOD11C3)",
			Instrument:         "Moderate Resolution Imaging Spectroradiometer",
			ProducingOrg:       "NASA LP DAAC",
			Units:              "°C",
			SpatialResolution:  "0.05° (~5.6 km)",
			TemporalResolution: "Monthly CMG",
			Category:           "land",
			BaselinePeriod:     "2000-2020",
			SupportedRegions:   []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"},
		},
		{
			ID:                 "SMAP_SOIL",
			Name:               "Root-Zone Soil Moisture L4",
			Mission:            "Soil Moisture Active Passive (SMAP)",
			Instrument:         "L-band Radiometer & Land Data Assimilation",
			ProducingOrg:       "NASA JPL / GSFC",
			Units:              "m³/m³",
			SpatialResolution:  "9 km EASE-Grid",
			TemporalResolution: "Monthly Aggregate",
			Category:           "land",
			BaselinePeriod:     "2015-2024",
			SupportedRegions:   []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"},
		},
		{
			ID:                 "MERRA2_QV2M",
			Name:               "2-Meter Specific Humidity",
			Mission:            "MERRA-2 Reanalysis",
			Instrument:         "ADAS / GMAO",
			ProducingOrg:       "NASA GMAO",
			Units:              "g/kg",
			SpatialResolution:  "0.5° × 0.625°",
			TemporalResolution: "Monthly Mean",
			Category:           "atmosphere",
			BaselinePeriod:     "2000-2020",
			SupportedRegions:   []string{"lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"},
		},
	}
}

// GetRegion finds a region by ID
func GetRegion(id string) (*models.Region, bool) {
	for _, r := range AvailableRegions() {
		if r.ID == id {
			return &r, true
		}
	}
	return nil, false
}

// GetVariable finds a dataset variable by ID
func GetVariable(id string) (*models.DatasetVariable, bool) {
	for _, v := range AvailableVariables() {
		if v.ID == id {
			return &v, true
		}
	}
	return nil, false
}
