package trendx

import (
	"fmt"
	"sort"
)

// SensSlopeResult holds the output of Sen's slope calculation
type SensSlopeResult struct {
	Slope      float64 `json:"slope"`
	AnnualRate float64 `json:"annual_rate"` // change per year (assuming monthly data * 12)
	N          int     `json:"n"`
	PairsCount int     `json:"pairs_count"`
	MedianRank int     `json:"median_rank"`
}

// SensSlope calculates Sen's robust slope estimator across all pairs
func SensSlope(data []float64) (*SensSlopeResult, error) {
	n := len(data)
	if n < 2 {
		return nil, fmt.Errorf("insufficient points for Sen's slope: got %d, minimum 2", n)
	}

	numPairs := n * (n - 1) / 2
	slopes := make([]float64, 0, numPairs)

	for k := 0; k < n-1; k++ {
		for j := k + 1; j < n; j++ {
			step := float64(j - k)
			slope := (data[j] - data[k]) / step
			slopes = append(slopes, slope)
		}
	}

	sort.Float64s(slopes)

	var medianSlope float64
	medianRank := len(slopes) / 2
	if len(slopes)%2 == 1 {
		medianSlope = slopes[medianRank]
	} else {
		medianSlope = (slopes[medianRank-1] + slopes[medianRank]) / 2.0
	}

	return &SensSlopeResult{
		Slope:      medianSlope,
		AnnualRate: medianSlope * 12.0,
		N:          n,
		PairsCount: len(slopes),
		MedianRank: medianRank,
	}, nil
}
