package geospatial

import (
	"errors"
	"fmt"
	"math"
	"sort"
)

// AggregationType represents the mathematical spatial reduction operator.
type AggregationType int

const (
	AggMean AggregationType = iota
	AggMedian
	AggVariance
)

// String returns human-readable representation of AggregationType.
func (a AggregationType) String() string {
	switch a {
	case AggMean:
		return "mean"
	case AggMedian:
		return "median"
	case AggVariance:
		return "variance"
	default:
		return "unknown"
	}
}

// ParseAggregationType converts string name to AggregationType.
func ParseAggregationType(name string) (AggregationType, error) {
	switch name {
	case "mean":
		return AggMean, nil
	case "median":
		return AggMedian, nil
	case "variance", "var":
		return AggVariance, nil
	default:
		return AggMean, fmt.Errorf("unsupported aggregation type: %q", name)
	}
}

// AggregationOptions controls spatial aggregation behavior.
type AggregationOptions struct {
	Weighted       bool // Cosine-latitude area weighting (recommended for global/regional lat-lon grids)
	SampleVariance bool // If true, divide by N-1 (sample variance); if false, divide by N (population variance)
}

// DefaultAggregationOptions provides default unweighted sample aggregation settings.
func DefaultAggregationOptions() AggregationOptions {
	return AggregationOptions{
		Weighted:       false,
		SampleVariance: true,
	}
}

// SpatialMean computes the spatial mean over all valid cells in the grid.
func SpatialMean(grid *SpatialGrid, weighted bool) (float64, error) {
	return Aggregate(grid, AggMean, AggregationOptions{Weighted: weighted})
}

// SpatialMedian computes the spatial median over all valid cells in the grid.
func SpatialMedian(grid *SpatialGrid, weighted bool) (float64, error) {
	return Aggregate(grid, AggMedian, AggregationOptions{Weighted: weighted})
}

// SpatialVariance computes the spatial variance over all valid cells in the grid.
func SpatialVariance(grid *SpatialGrid, sample, weighted bool) (float64, error) {
	return Aggregate(grid, AggVariance, AggregationOptions{SampleVariance: sample, Weighted: weighted})
}

// Aggregate executes the specified spatial reduction over all valid cells in the grid.
func Aggregate(grid *SpatialGrid, aggType AggregationType, opts AggregationOptions) (float64, error) {
	if grid == nil {
		return 0, errors.New("grid cannot be nil")
	}

	switch aggType {
	case AggMean:
		return computeMean(grid, nil, opts.Weighted)
	case AggMedian:
		return computeMedian(grid, nil, opts.Weighted)
	case AggVariance:
		return computeVariance(grid, nil, opts.SampleVariance, opts.Weighted)
	default:
		return 0, fmt.Errorf("unsupported aggregation type: %v", aggType)
	}
}

// AggregateMasked executes the spatial reduction using a precomputed mask.
func AggregateMasked(grid *SpatialGrid, mask *SpatialMask, aggType AggregationType, opts AggregationOptions) (float64, error) {
	if grid == nil {
		return 0, errors.New("grid cannot be nil")
	}
	if mask == nil {
		return Aggregate(grid, aggType, opts)
	}

	switch aggType {
	case AggMean:
		return computeMean(grid, mask, opts.Weighted)
	case AggMedian:
		return computeMedian(grid, mask, opts.Weighted)
	case AggVariance:
		return computeVariance(grid, mask, opts.SampleVariance, opts.Weighted)
	default:
		return 0, fmt.Errorf("unsupported aggregation type: %v", aggType)
	}
}

// computeMean calculates arithmetic or cosine-latitude weighted mean in a single pass with O(1) memory.
func computeMean(grid *SpatialGrid, mask *SpatialMask, weighted bool) (float64, error) {
	const degToRad = math.Pi / 180.0

	var sum float64
	var weightSum float64
	count := 0

	iterator := getCellIterator(grid, mask)
	for iterator.Next() {
		idx, row := iterator.IndexAndRow()
		val := grid.Data[idx]
		if !grid.IsValid(val) {
			continue
		}

		w := 1.0
		if weighted {
			lat := grid.Spec.BBox.MaxLat - (float64(row)+0.5)*grid.Spec.ResY
			w = math.Cos(lat * degToRad)
			if w < 0 {
				w = 0 // Guard against invalid negative cosine values
			}
		}

		sum += val * w
		weightSum += w
		count++
	}

	if count == 0 {
		return math.NaN(), errors.New("cannot compute spatial mean: no valid data cells")
	}
	if weighted && weightSum <= 0 {
		return math.NaN(), errors.New("sum of spatial weights is zero")
	}

	if weighted {
		return sum / weightSum, nil
	}
	return sum / float64(count), nil
}

// computeMedian calculates unweighted or weighted median.
func computeMedian(grid *SpatialGrid, mask *SpatialMask, weighted bool) (float64, error) {
	const degToRad = math.Pi / 180.0

	iterator := getCellIterator(grid, mask)

	if !weighted {
		// Collect valid values
		vals := make([]float64, 0, 64)
		for iterator.Next() {
			idx, _ := iterator.IndexAndRow()
			val := grid.Data[idx]
			if grid.IsValid(val) {
				vals = append(vals, val)
			}
		}

		n := len(vals)
		if n == 0 {
			return math.NaN(), errors.New("cannot compute spatial median: no valid data cells")
		}

		sort.Float64s(vals)
		if n%2 == 1 {
			return vals[n/2], nil
		}
		return (vals[n/2-1] + vals[n/2]) / 2.0, nil
	}

	// Weighted median
	type weightedVal struct {
		val float64
		w   float64
	}

	wVals := make([]weightedVal, 0, 64)
	var totalWeight float64

	for iterator.Next() {
		idx, row := iterator.IndexAndRow()
		val := grid.Data[idx]
		if !grid.IsValid(val) {
			continue
		}

		lat := grid.Spec.BBox.MaxLat - (float64(row)+0.5)*grid.Spec.ResY
		w := math.Cos(lat * degToRad)
		if w <= 0 {
			continue
		}

		wVals = append(wVals, weightedVal{val: val, w: w})
		totalWeight += w
	}

	n := len(wVals)
	if n == 0 {
		return math.NaN(), errors.New("cannot compute weighted spatial median: no valid data cells")
	}

	sort.Slice(wVals, func(i, j int) bool {
		return wVals[i].val < wVals[j].val
	})

	halfWeight := totalWeight / 2.0
	var cumWeight float64
	for i, wv := range wVals {
		cumWeight += wv.w
		if cumWeight > halfWeight {
			return wv.val, nil
		}
		if math.Abs(cumWeight-halfWeight) < 1e-12 {
			if i+1 < n {
				return (wv.val + wVals[i+1].val) / 2.0, nil
			}
			return wv.val, nil
		}
	}

	return wVals[n-1].val, nil
}

// computeVariance calculates sample or population spatial variance using a numerically stable two-pass algorithm.
func computeVariance(grid *SpatialGrid, mask *SpatialMask, sample, weighted bool) (float64, error) {
	mean, err := computeMean(grid, mask, weighted)
	if err != nil {
		return math.NaN(), fmt.Errorf("failed to compute mean for variance: %w", err)
	}

	const degToRad = math.Pi / 180.0
	var sumSqDiff float64
	var weightSum float64
	var sumSqWeight float64
	count := 0

	iterator := getCellIterator(grid, mask)
	for iterator.Next() {
		idx, row := iterator.IndexAndRow()
		val := grid.Data[idx]
		if !grid.IsValid(val) {
			continue
		}

		diff := val - mean
		diffSq := diff * diff

		if !weighted {
			sumSqDiff += diffSq
		} else {
			lat := grid.Spec.BBox.MaxLat - (float64(row)+0.5)*grid.Spec.ResY
			w := math.Cos(lat * degToRad)
			if w < 0 {
				w = 0
			}
			sumSqDiff += diffSq * w
			weightSum += w
			sumSqWeight += w * w
		}
		count++
	}

	if count == 0 {
		return math.NaN(), errors.New("cannot compute spatial variance: no valid data cells")
	}

	if !weighted {
		if sample {
			if count <= 1 {
				return 0.0, nil
			}
			return sumSqDiff / float64(count-1), nil
		}
		return sumSqDiff / float64(count), nil
	}

	// Weighted variance
	if sample {
		// Unbiased weighted sample variance using Bessel correction:
		// divisor = sum(w) - (sum(w^2) / sum(w))
		denom := weightSum - (sumSqWeight / weightSum)
		if denom <= 1e-12 {
			return 0.0, nil
		}
		return sumSqDiff / denom, nil
	}

	if weightSum <= 0 {
		return 0.0, errors.New("sum of spatial weights is zero")
	}
	return sumSqDiff / weightSum, nil
}

// cellIterator abstracts iterating through full grids vs masked valid indices.
type cellIterator struct {
	mask    *SpatialMask
	cols    int
	total   int
	curr    int
	currIdx int
	currRow int
}

func getCellIterator(grid *SpatialGrid, mask *SpatialMask) *cellIterator {
	if mask != nil {
		return &cellIterator{
			mask:    mask,
			cols:    grid.Spec.Cols,
			total:   len(mask.ValidIndices),
			curr:    -1,
			currIdx: -1,
		}
	}
	return &cellIterator{
		mask:    nil,
		cols:    grid.Spec.Cols,
		total:   len(grid.Data),
		curr:    -1,
		currIdx: -1,
	}
}

func (it *cellIterator) Next() bool {
	it.curr++
	if it.curr >= it.total {
		return false
	}
	if it.mask != nil {
		it.currIdx = it.mask.ValidIndices[it.curr]
	} else {
		it.currIdx = it.curr
	}
	it.currRow = it.currIdx / it.cols
	return true
}

func (it *cellIterator) IndexAndRow() (int, int) {
	return it.currIdx, it.currRow
}
