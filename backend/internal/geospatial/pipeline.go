package geospatial

import (
	"errors"
	"fmt"
	"math"
	"sync"

	"github.com/pollo/backend/internal/models"
)

// TemporalGrid pairs a 2D SpatialGrid observation with its temporal metadata.
type TemporalGrid struct {
	Date      string       `json:"date"` // e.g. "2000-01"
	Timestamp int64        `json:"timestamp"`
	Grid      *SpatialGrid `json:"grid"`
}

// GridProvider defines an interface for streaming spatial grids across time steps.
// This allows processing 25-year (300 months) grids with O(1) grid memory consumption.
type GridProvider interface {
	Next() (*TemporalGrid, error)
	Reset() error
	TotalSteps() int
}

// SliceGridProvider implements GridProvider backed by an in-memory slice of TemporalGrids.
type SliceGridProvider struct {
	grids []*TemporalGrid
	index int
}

// NewSliceGridProvider creates a GridProvider from a slice of TemporalGrid.
func NewSliceGridProvider(grids []*TemporalGrid) *SliceGridProvider {
	return &SliceGridProvider{
		grids: grids,
		index: 0,
	}
}

func (p *SliceGridProvider) Next() (*TemporalGrid, error) {
	if p.index >= len(p.grids) {
		return nil, nil // EOF
	}
	g := p.grids[p.index]
	p.index++
	return g, nil
}

func (p *SliceGridProvider) Reset() error {
	p.index = 0
	return nil
}

func (p *SliceGridProvider) TotalSteps() int {
	return len(p.grids)
}

// RegionTarget specifies a region identifier and its geometric boundary for extraction.
type RegionTarget struct {
	ID        string
	Polygon   *Polygon
	MultiPoly *MultiPolygon
}

// ExtractTimeSeries performs spatial time-series extraction for a single polygon region.
func ExtractTimeSeries(
	grids []*TemporalGrid,
	poly *Polygon,
	aggType AggregationType,
	opts AggregationOptions,
) ([]models.TimeSeriesPoint, error) {
	provider := NewSliceGridProvider(grids)
	return ExtractStreamTimeSeries(provider, poly, aggType, opts)
}

// ExtractStreamTimeSeries performs streaming extraction for a single polygon region with minimal memory footprint.
func ExtractStreamTimeSeries(
	provider GridProvider,
	poly *Polygon,
	aggType AggregationType,
	opts AggregationOptions,
) ([]models.TimeSeriesPoint, error) {
	if provider == nil {
		return nil, errors.New("grid provider cannot be nil")
	}
	if poly == nil {
		return nil, errors.New("polygon cannot be nil")
	}

	polyBBox := poly.BoundingBox()
	var precomputedMask *SpatialMask
	var maskBBox models.BoundingBox
	hasMask := false

	totalSteps := provider.TotalSteps()
	points := make([]models.TimeSeriesPoint, 0, totalSteps)

	for {
		tg, err := provider.Next()
		if err != nil {
			return nil, fmt.Errorf("error reading grid step: %w", err)
		}
		if tg == nil {
			break // Finished
		}
		if tg.Grid == nil {
			continue
		}

		// Initialize precomputed mask on the first grid
		if !hasMask {
			interBBox, ok := BoundingBoxIntersection(tg.Grid.Spec.BBox, polyBBox)
			if !ok {
				return nil, fmt.Errorf("polygon envelope does not intersect grid extent")
			}
			maskBBox = interBBox

			// Create a clipped subgrid to compute mask dimensions
			subGrid, err := tg.Grid.ClipByBoundingBox(maskBBox)
			if err != nil {
				return nil, fmt.Errorf("failed to initialize subgrid mask: %w", err)
			}
			precomputedMask = ComputeSpatialMask(subGrid.Spec, poly)
			hasMask = true
		}

		// Crop to region envelope
		subGrid, err := tg.Grid.ClipByBoundingBox(maskBBox)
		if err != nil {
			return nil, fmt.Errorf("failed to clip grid at %s: %w", tg.Date, err)
		}

		val, err := AggregateMasked(subGrid, precomputedMask, aggType, opts)
		if err != nil {
			// If all cells are NaN, treat as NaN
			val = math.NaN()
		} else {
			// Round to 3 decimal places to match POLLO API convention
			val = math.Round(val*1000) / 1000
		}

		points = append(points, models.TimeSeriesPoint{
			Date:      tg.Date,
			Timestamp: tg.Timestamp,
			Value:     val,
		})
	}

	return points, nil
}

// ExtractMultiRegionTimeSeries extracts time series across multiple regions concurrently.
func ExtractMultiRegionTimeSeries(
	grids []*TemporalGrid,
	regions []RegionTarget,
	aggType AggregationType,
	opts AggregationOptions,
) (map[string][]models.TimeSeriesPoint, error) {
	if len(regions) == 0 {
		return make(map[string][]models.TimeSeriesPoint), nil
	}

	// For in-memory slice grids, we can process each region in parallel
	resultMap := make(map[string][]models.TimeSeriesPoint, len(regions))
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(regions))

	for _, r := range regions {
		target := r
		wg.Add(1)
		go func() {
			defer wg.Done()

			var series []models.TimeSeriesPoint
			var err error

			if target.Polygon != nil {
				series, err = ExtractTimeSeries(grids, target.Polygon, aggType, opts)
			} else if target.MultiPoly != nil {
				series, err = extractMultiPolyTimeSeries(grids, target.MultiPoly, aggType, opts)
			} else {
				err = fmt.Errorf("region %s has no polygon geometry", target.ID)
			}

			if err != nil {
				errChan <- fmt.Errorf("region %s extraction failed: %w", target.ID, err)
				return
			}

			mu.Lock()
			resultMap[target.ID] = series
			mu.Unlock()
		}()
	}

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		return nil, <-errChan
	}

	return resultMap, nil
}

// ExtractStreamMultiRegionTimeSeries performs single-pass streaming extraction for multiple regions.
func ExtractStreamMultiRegionTimeSeries(
	provider GridProvider,
	regions []RegionTarget,
	aggType AggregationType,
	opts AggregationOptions,
) (map[string][]models.TimeSeriesPoint, error) {
	if provider == nil {
		return nil, errors.New("grid provider cannot be nil")
	}
	if len(regions) == 0 {
		return make(map[string][]models.TimeSeriesPoint), nil
	}

	type regionContext struct {
		target   RegionTarget
		maskBBox models.BoundingBox
		mask     *SpatialMask
		points   []models.TimeSeriesPoint
	}

	totalSteps := provider.TotalSteps()
	contexts := make([]*regionContext, len(regions))
	for i, r := range regions {
		contexts[i] = &regionContext{
			target: r,
			points: make([]models.TimeSeriesPoint, 0, totalSteps),
		}
	}

	initialized := false

	for {
		tg, err := provider.Next()
		if err != nil {
			return nil, fmt.Errorf("streaming grid step error: %w", err)
		}
		if tg == nil {
			break
		}
		if tg.Grid == nil {
			continue
		}

		// Initialize masks on first step
		if !initialized {
			for _, ctx := range contexts {
				var targetBBox models.BoundingBox
				if ctx.target.Polygon != nil {
					targetBBox = ctx.target.Polygon.BoundingBox()
				} else if ctx.target.MultiPoly != nil {
					targetBBox = ctx.target.MultiPoly.BoundingBox()
				} else {
					return nil, fmt.Errorf("region %s has no geometry", ctx.target.ID)
				}

				interBBox, ok := BoundingBoxIntersection(tg.Grid.Spec.BBox, targetBBox)
				if !ok {
					return nil, fmt.Errorf("region %s envelope does not intersect grid extent", ctx.target.ID)
				}
				ctx.maskBBox = interBBox

				subGrid, err := tg.Grid.ClipByBoundingBox(interBBox)
				if err != nil {
					return nil, fmt.Errorf("failed to initialize subgrid for region %s: %w", ctx.target.ID, err)
				}

				if ctx.target.Polygon != nil {
					ctx.mask = ComputeSpatialMask(subGrid.Spec, ctx.target.Polygon)
				} else {
					ctx.mask = ComputeMultiPolygonMask(subGrid.Spec, ctx.target.MultiPoly)
				}
			}
			initialized = true
		}

		// Process each region for current time step concurrently
		var wg sync.WaitGroup
		var stepErr error
		var errOnce sync.Once

		for _, ctx := range contexts {
			rc := ctx
			wg.Add(1)
			go func() {
				defer wg.Done()

				subGrid, err := tg.Grid.ClipByBoundingBox(rc.maskBBox)
				if err != nil {
					errOnce.Do(func() { stepErr = err })
					return
				}

				val, err := AggregateMasked(subGrid, rc.mask, aggType, opts)
				if err != nil {
					val = math.NaN()
				} else {
					val = math.Round(val*1000) / 1000
				}

				rc.points = append(rc.points, models.TimeSeriesPoint{
					Date:      tg.Date,
					Timestamp: tg.Timestamp,
					Value:     val,
				})
			}()
		}
		wg.Wait()

		if stepErr != nil {
			return nil, fmt.Errorf("error processing regions at %s: %w", tg.Date, stepErr)
		}
	}

	resultMap := make(map[string][]models.TimeSeriesPoint, len(contexts))
	for _, ctx := range contexts {
		resultMap[ctx.target.ID] = ctx.points
	}

	return resultMap, nil
}

func extractMultiPolyTimeSeries(
	grids []*TemporalGrid,
	mp *MultiPolygon,
	aggType AggregationType,
	opts AggregationOptions,
) ([]models.TimeSeriesPoint, error) {
	if len(grids) == 0 {
		return []models.TimeSeriesPoint{}, nil
	}

	mpBBox := mp.BoundingBox()
	interBBox, ok := BoundingBoxIntersection(grids[0].Grid.Spec.BBox, mpBBox)
	if !ok {
		return nil, errors.New("multi-polygon envelope does not intersect grid extent")
	}

	subGrid0, err := grids[0].Grid.ClipByBoundingBox(interBBox)
	if err != nil {
		return nil, err
	}
	mask := ComputeMultiPolygonMask(subGrid0.Spec, mp)

	points := make([]models.TimeSeriesPoint, len(grids))
	for i, tg := range grids {
		subGrid, err := tg.Grid.ClipByBoundingBox(interBBox)
		if err != nil {
			return nil, err
		}

		val, err := AggregateMasked(subGrid, mask, aggType, opts)
		if err != nil {
			val = math.NaN()
		} else {
			val = math.Round(val*1000) / 1000
		}

		points[i] = models.TimeSeriesPoint{
			Date:      tg.Date,
			Timestamp: tg.Timestamp,
			Value:     val,
		}
	}

	return points, nil
}
