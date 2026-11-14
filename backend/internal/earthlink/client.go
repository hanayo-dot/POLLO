package earthlink

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pollo/backend/internal/config"
)

const gibsDateFormat = "2006-01-02"

// GIBSLayer holds the WMTS metadata needed to request one imagery layer.
type GIBSLayer struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	LayerName   string `json:"layer_name"`
	Format      string `json:"format"`
	TileMatrix  string `json:"tile_matrix_set"`
	MaxZoom     int    `json:"max_zoom"`
	Description string `json:"description"`
}

// Client interacts with NASA GIBS WMTS and caches successful responses locally.
type Client struct {
	cfg        *config.Config
	httpClient *http.Client
}

func NewClient(cfg *config.Config) *Client {
	if cfg == nil {
		cfg = config.Load()
	}
	return &Client{cfg: cfg, httpClient: &http.Client{Timeout: 30 * time.Second}}
}

func (c *Client) GetAvailableGIBSLayers() []GIBSLayer {
	return []GIBSLayer{
		{ID: "MODIS_Terra_CorrectedReflectance_TrueColor", Title: "MODIS Terra Corrected Reflectance (True Color)", LayerName: "MODIS_Terra_CorrectedReflectance_TrueColor", Format: "jpg", TileMatrix: "GoogleMapsCompatible_Level9", MaxZoom: 9, Description: "Daily natural color imagery of land, oceans, and atmospheric features."},
		{ID: "IMERG_Precipitation_Rate", Title: "GPM IMERG Precipitation Rate (V07)", LayerName: "IMERG_Precipitation_Rate", Format: "png", TileMatrix: "GoogleMapsCompatible_Level6", MaxZoom: 6, Description: "Global satellite precipitation rates calibrated with surface rain gauges."},
		{ID: "MODIS_Terra_LST_Day", Title: "MODIS Terra Land Surface Temperature (Day)", LayerName: "MODIS_Terra_Land_Surface_Temp_Day", Format: "png", TileMatrix: "GoogleMapsCompatible_Level7", MaxZoom: 7, Description: "Daytime radiometric land surface temperature."},
	}
}

func (c *Client) layerByID(id string) (GIBSLayer, bool) {
	for _, layer := range c.GetAvailableGIBSLayers() {
		if layer.ID == id || layer.LayerName == id {
			return layer, true
		}
	}
	return GIBSLayer{}, false
}

// BuildWMTSURL constructs a GIBS WMTS KVP tile URL. Coordinates use XYZ order.
func (c *Client) BuildWMTSURL(layerID string, date time.Time, z, x, y int) string {
	layer, ok := c.layerByID(layerID)
	if !ok {
		return ""
	}
	u, err := url.Parse(strings.TrimRight(c.cfg.NASAGIBSEndpoint, "/") + "/wmts.cgi")
	if err != nil {
		return ""
	}
	format := "image/jpeg"
	if layer.Format == "png" {
		format = "image/png"
	}
	q := u.Query()
	q.Set("SERVICE", "WMTS")
	q.Set("REQUEST", "GetTile")
	q.Set("VERSION", "1.0.0")
	q.Set("LAYER", layer.LayerName)
	q.Set("STYLE", "default")
	q.Set("FORMAT", format)
	q.Set("TILEMATRIXSET", layer.TileMatrix)
	q.Set("TILEMATRIX", fmt.Sprint(z))
	q.Set("TILECOL", fmt.Sprint(x))
	q.Set("TILEROW", fmt.Sprint(y))
	q.Set("TIME", date.Format(gibsDateFormat))
	u.RawQuery = q.Encode()
	return u.String()
}

// GetTile returns a tile and its media type, using a local cache when available.
func (c *Client) GetTile(ctx context.Context, layerID string, date time.Time, z, x, y int) ([]byte, string, error) {
	layer, ok := c.layerByID(layerID)
	if !ok {
		return nil, "", fmt.Errorf("unsupported GIBS layer %q", layerID)
	}
	if z < 0 || z > layer.MaxZoom || x < 0 || y < 0 || x >= 1<<z || y >= 1<<z {
		return nil, "", errors.New("tile coordinates are outside the supported matrix")
	}
	if date.IsZero() {
		return nil, "", errors.New("date is required")
	}
	cachePath := filepath.Join(c.cfg.CacheDir, "gibs", layer.ID, date.Format(gibsDateFormat), fmt.Sprint(z), fmt.Sprint(x), fmt.Sprintf("%d.%s", y, layer.Format))
	if content, err := os.ReadFile(cachePath); err == nil {
		return content, layerContentType(layer), nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, "", fmt.Errorf("read tile cache: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BuildWMTSURL(layerID, date, z, x, y), nil)
	if err != nil {
		return nil, "", err
	}
	if token := c.cfg.NASAEarthdataToken; token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	} else if c.cfg.NASAEarthdataUser != "" && c.cfg.NASAEarthdataPass != "" {
		// Basic credentials are only sent to the configured NASA GIBS host.
		req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.cfg.NASAEarthdataUser+":"+c.cfg.NASAEarthdataPass)))
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("request GIBS tile: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return nil, "", fmt.Errorf("GIBS returned HTTP %d", resp.StatusCode)
	}
	content, err := io.ReadAll(io.LimitReader(resp.Body, (10<<20)+1))
	if err != nil {
		return nil, "", fmt.Errorf("read GIBS tile: %w", err)
	}
	if len(content) > 10<<20 {
		return nil, "", errors.New("GIBS tile exceeds 10 MiB limit")
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = layerContentType(layer)
	}
	if err := atomicCacheWrite(cachePath, content); err != nil {
		return nil, "", fmt.Errorf("cache GIBS tile: %w", err)
	}
	metadata, err := json.Marshal(struct {
		LayerID     string    `json:"layer_id"`
		LayerName   string    `json:"layer_name"`
		Date        string    `json:"date"`
		Zoom        int       `json:"z"`
		X           int       `json:"x"`
		Y           int       `json:"y"`
		ContentType string    `json:"content_type"`
		FetchedAt   time.Time `json:"fetched_at"`
	}{layer.ID, layer.LayerName, date.Format(gibsDateFormat), z, x, y, contentType, time.Now().UTC()})
	if err != nil {
		return nil, "", fmt.Errorf("encode GIBS cache metadata: %w", err)
	}
	if err := atomicCacheWrite(strings.TrimSuffix(cachePath, filepath.Ext(cachePath))+".json", metadata); err != nil {
		return nil, "", fmt.Errorf("cache GIBS metadata: %w", err)
	}
	return content, contentType, nil
}

func layerContentType(layer GIBSLayer) string {
	if layer.Format == "png" {
		return "image/png"
	}
	return "image/jpeg"
}

func atomicCacheWrite(path string, content []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".tile-*.tmp")
	if err != nil {
		return err
	}
	tmp := f.Name()
	defer os.Remove(tmp)
	if _, err = f.Write(content); err == nil {
		err = f.Sync()
	}
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
