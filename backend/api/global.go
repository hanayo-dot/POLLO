package api

import (
	"context"
	"fmt"
	"github.com/pollo/backend/internal/models"
	"github.com/pollo/backend/internal/observations"
	"net/http"
	"strings"
	"time"
)

var observationClient = observations.NewClient()

// The UI deliberately uses only the four catalog regions. Observational data
// is a grid-cell reference point inside the region, not a basin-wide average.
func (r *Router) handleObservedRegion(w http.ResponseWriter, req *http.Request, region models.Region) {
	q := req.URL.Query()
	lat := (region.BBox.MinLat + region.BBox.MaxLat) / 2
	lon := (region.BBox.MinLon + region.BBox.MaxLon) / 2
	// Named on-land reference points avoid water cells at the geometric centroid.
	switch region.ID {
	case "lake_victoria_basin":
		lat, lon = -0.1022, 34.7617
	case "horn_of_africa":
		lat, lon = 5.35, 45.15
	case "congo_basin":
		lat, lon = 0.52, 25.2
	case "sahel_belt":
		lat, lon = 13.5, 2.1
	}
	if _, _, err := observations.Validate(lat, lon, q.Get("start"), q.Get("end")); err != nil {
		respondError(w, 400, err.Error())
		return
	}
	if q.Get("deseasonalize") == "true" {
		respondError(w, 400, "Observational analyses currently use raw monthly measurements")
		return
	}
	ctx, cancel := context.WithTimeout(req.Context(), 4*time.Minute)
	defer cancel()
	result, err := observationClient.Series(ctx, lat, lon, strings.TrimSpace(region.Name), q.Get("variable"), q.Get("start"), q.Get("end"))
	if err != nil {
		respondError(w, 502, fmt.Sprintf("Could not load historical measurements: %s", err))
		return
	}
	result.Region.ID = region.ID
	result.Region.Country = region.Country
	sourceCopy := *result.Source
	result.Source = &sourceCopy
	result.Source.Description += fmt.Sprintf(" Reference point: %.4f, %.4f within %s; not an area average.", lat, lon, region.Name)
	if result.Trend != nil {
		copy := *result.Trend
		copy.RegionID = region.ID
		result.Trend = &copy
	}
	respondJSON(w, 200, result)
}
