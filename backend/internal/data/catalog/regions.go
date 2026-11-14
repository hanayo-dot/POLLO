package catalog

import (
	"fmt"

	"github.com/pollo/backend/internal/geospatial"
	"github.com/pollo/backend/internal/models"
)

// regionPolygonMap stores the geometric boundary polygons for POLLO catalog regions.
var regionPolygonMap = make(map[string]*geospatial.Polygon)

func init() {
	// 1. Lake Victoria Basin (East Africa)
	// Extent: 29.0°E - 36.0°E, 4.5°S - 2.5°N
	lvRing := geospatial.Ring{
		{Lon: 31.5, Lat: 2.0},
		{Lon: 34.5, Lat: 1.5},
		{Lon: 35.5, Lat: -0.5},
		{Lon: 35.0, Lat: -2.5},
		{Lon: 34.0, Lat: -4.0},
		{Lon: 31.5, Lat: -4.0},
		{Lon: 30.0, Lat: -2.5},
		{Lon: 29.5, Lat: -0.5},
		{Lon: 30.5, Lat: 1.5},
		{Lon: 31.5, Lat: 2.0},
	}
	if p, err := geospatial.NewPolygon(lvRing); err == nil {
		regionPolygonMap["lake_victoria_basin"] = p
	}

	// 2. Horn of Africa (Somalia / Ogaden)
	// Extent: 40.0°E - 51.5°E, 0.0°N - 12.0°N
	hoaRing := geospatial.Ring{
		{Lon: 42.0, Lat: 11.5},
		{Lon: 50.5, Lat: 11.8},
		{Lon: 51.2, Lat: 10.0},
		{Lon: 49.0, Lat: 6.0},
		{Lon: 46.0, Lat: 2.0},
		{Lon: 41.0, Lat: 0.5},
		{Lon: 40.5, Lat: 4.0},
		{Lon: 41.5, Lat: 8.0},
		{Lon: 42.0, Lat: 11.5},
	}
	if p, err := geospatial.NewPolygon(hoaRing); err == nil {
		regionPolygonMap["horn_of_africa"] = p
	}

	// 3. Congo Rainforest Basin
	// Extent: 14.0°E - 29.0°E, 5.0°S - 5.0°N
	congoRing := geospatial.Ring{
		{Lon: 16.0, Lat: 4.5},
		{Lon: 25.0, Lat: 4.8},
		{Lon: 28.5, Lat: 2.0},
		{Lon: 28.0, Lat: -3.0},
		{Lon: 24.0, Lat: -4.8},
		{Lon: 17.0, Lat: -4.5},
		{Lon: 14.5, Lat: -2.0},
		{Lon: 15.0, Lat: 2.0},
		{Lon: 16.0, Lat: 4.5},
	}
	if p, err := geospatial.NewPolygon(congoRing); err == nil {
		regionPolygonMap["congo_basin"] = p
	}

	// 4. Sudano-Sahel Transition Belt
	// Extent: -5.0°E - 25.0°E, 11.0°N - 18.0°N
	sahelRing := geospatial.Ring{
		{Lon: -4.0, Lat: 16.5},
		{Lon: 10.0, Lat: 17.5},
		{Lon: 24.0, Lat: 17.0},
		{Lon: 24.5, Lat: 13.0},
		{Lon: 12.0, Lat: 12.0},
		{Lon: -4.5, Lat: 12.5},
		{Lon: -4.0, Lat: 16.5},
	}
	if p, err := geospatial.NewPolygon(sahelRing); err == nil {
		regionPolygonMap["sahel_belt"] = p
	}
}

// GetRegionPolygon retrieves the boundary polygon associated with a region ID.
func GetRegionPolygon(regionID string) (*geospatial.Polygon, bool) {
	poly, ok := regionPolygonMap[regionID]
	return poly, ok
}

// AvailableRegionPolygons returns the full map of registered region polygons.
func AvailableRegionPolygons() map[string]*geospatial.Polygon {
	clone := make(map[string]*geospatial.Polygon, len(regionPolygonMap))
	for k, v := range regionPolygonMap {
		clone[k] = v
	}
	return clone
}

// RegionToGeospatialTarget constructs a RegionTarget from a Region model.
func RegionToGeospatialTarget(reg models.Region) (geospatial.RegionTarget, error) {
	poly, ok := GetRegionPolygon(reg.ID)
	if !ok {
		// Fallback: construct rectangular polygon from Region.BBox
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
			return geospatial.RegionTarget{}, fmt.Errorf("failed to create fallback polygon for region %s: %w", reg.ID, err)
		}
	}

	return geospatial.RegionTarget{
		ID:      reg.ID,
		Polygon: poly,
	}, nil
}
