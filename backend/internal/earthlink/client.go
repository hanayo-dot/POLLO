package earthlink

import (
	"fmt"
	"time"

	"github.com/pollo/backend/internal/config"
)

// GIBSLayer holds NASA GIBS WMTS metadata
type GIBSLayer struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	LayerName   string `json:"layer_name"`
	Format      string `json:"format"`
	TileMatrix  string `json:"tile_matrix_set"`
	Description string `json:"description"`
}

// Client interacts with NASA Earthdata & GIBS WMTS
type Client struct {
	cfg *config.Config
}

// NewClient creates an EarthLink client
func NewClient(cfg *config.Config) *Client {
	return &Client{cfg: cfg}
}

// GetAvailableGIBSLayers returns active NASA GIBS layers
func (c *Client) GetAvailableGIBSLayers() []GIBSLayer {
	return []GIBSLayer{
		{
			ID:          "MODIS_Terra_CorrectedReflectance_TrueColor",
			Title:       "MODIS Terra Corrected Reflectance (True Color)",
			LayerName:   "MODIS_Terra_CorrectedReflectance_TrueColor",
			Format:      "jpg",
			TileMatrix:  "GoogleMapsCompatible_Level9",
			Description: "High-resolution daily natural color imagery of land, oceans, and atmospheric features.",
		},
		{
			ID:          "IMERG_Precipitation_Rate",
			Title:       "GPM IMERG Precipitation Rate (V07)",
			LayerName:   "IMERG_Precipitation_Rate",
			Format:      "png",
			TileMatrix:  "GoogleMapsCompatible_Level6",
			Description: "Global satellite precipitation rates calibrated with surface rain gauges.",
		},
		{
			ID:          "MODIS_Terra_LST_Day",
			Title:       "MODIS Terra Land Surface Temperature (Day)",
			LayerName:   "MODIS_Terra_Land_Surface_Temp_Day",
			Format:      "png",
			TileMatrix:  "GoogleMapsCompatible_Level7",
			Description: "Radiometric surface skin temperature of the Earth's land surfaces during daytime.",
		},
		{
			ID:          "AIRS_CO_Total_Column",
			Title:       "AIRS Carbon Monoxide Total Column",
			LayerName:   "AIRS_CO_Total_Column_Day",
			Format:      "png",
			TileMatrix:  "GoogleMapsCompatible_Level6",
			Description: "Tropospheric carbon monoxide column concentrations derived from NASA AIRS.",
		},
	}
}

// BuildWMTSURL constructs a direct GIBS WMTS tile URL for a given layer, date, and tile coordinates
func (c *Client) BuildWMTSURL(layerID string, date time.Time, z, y, x int) string {
	dateStr := date.Format("2006-01-02")
	format := "image/jpeg"
	ext := "jpg"
	if layerID == "IMERG_Precipitation_Rate" || layerID == "MODIS_Terra_Land_Surface_Temp_Day" {
		format = "image/png"
		ext = "png"
	}
	_ = format

	return fmt.Sprintf("%s/wmts.cgi?layer=%s&style=default&tilematrixset=GoogleMapsCompatible_Level9&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/%s&TileMatrix=%d&TileCol=%d&TileRow=%d&TIME=%s",
		c.cfg.NASAGIBSEndpoint, layerID, ext, z, x, y, dateStr)
}
