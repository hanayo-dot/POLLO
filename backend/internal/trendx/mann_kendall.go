package trendx

import (
	"fmt"
	"math"
	"sort"
)

// MKResult represents the output of the Mann-Kendall trend test
type MKResult struct {
	N              int     `json:"n"`
	S              float64 `json:"s"`
	VarianceS      float64 `json:"variance_s"`
	Z              float64 `json:"z"`
	PValue         float64 `json:"p_value"`
	Tau            float64 `json:"tau"`
	Significance   string  `json:"significance"`    // "significant", "marginal", "none"
	TrendDirection string  `json:"trend_direction"` // "increasing", "decreasing", "neutral"
}

// MannKendall performs the non-parametric Mann-Kendall test with tie correction
func MannKendall(data []float64) (*MKResult, error) {
	n := len(data)
	if n < 4 {
		return nil, fmt.Errorf("insufficient data points for Mann-Kendall test: got %d, minimum required is 4", n)
	}

	// 1. Calculate S statistic
	var s float64
	for k := 0; k < n-1; k++ {
		for j := k + 1; j < n; j++ {
			diff := data[j] - data[k]
			if diff > 1e-12 {
				s += 1.0
			} else if diff < -1e-12 {
				s -= 1.0
			}
		}
	}

	// 2. Identify tied groups for variance tie correction
	sortedData := make([]float64, n)
	copy(sortedData, data)
	sort.Float64s(sortedData)

	tieTerm := 0.0
	currentCount := 1
	for i := 1; i < n; i++ {
		if math.Abs(sortedData[i]-sortedData[i-1]) < 1e-12 {
			currentCount++
		} else {
			if currentCount > 1 {
				tp := float64(currentCount)
				tieTerm += tp * (tp - 1.0) * (2.0*tp + 5.0)
			}
			currentCount = 1
		}
	}
	if currentCount > 1 {
		tp := float64(currentCount)
		tieTerm += tp * (tp - 1.0) * (2.0*tp + 5.0)
	}

	// 3. Calculate Variance of S
	nf := float64(n)
	baseVar := nf * (nf - 1.0) * (2.0*nf + 5.0)
	varS := (baseVar - tieTerm) / 18.0

	// 4. Calculate Z statistic
	var z float64
	if varS > 0 {
		stdDev := math.Sqrt(varS)
		if s > 0 {
			z = (s - 1.0) / stdDev
		} else if s < 0 {
			z = (s + 1.0) / stdDev
		} else {
			z = 0.0
		}
	}

	// 5. Calculate two-tailed p-value using complementary error function
	// P(|Z| >= |z|) = erfc(|z| / sqrt(2))
	pValue := math.Erfc(math.Abs(z) / math.Sqrt2)
	if pValue > 1.0 {
		pValue = 1.0
	} else if pValue < 0.0 {
		pValue = 0.0
	}

	// 6. Kendall's Tau: S / (n * (n - 1) / 2)
	maxPairs := nf * (nf - 1.0) / 2.0
	tau := 0.0
	if maxPairs > 0 {
		tau = s / maxPairs
	}

	// 7. Determine significance and direction
	var significance string
	if pValue <= 0.05 {
		significance = "significant"
	} else if pValue <= 0.10 {
		significance = "marginal"
	} else {
		significance = "none"
	}

	var direction string
	if z > 0 && significance != "none" {
		direction = "increasing"
	} else if z < 0 && significance != "none" {
		direction = "decreasing"
	} else {
		direction = "neutral"
	}

	return &MKResult{
		N:              n,
		S:              s,
		VarianceS:      varS,
		Z:              z,
		PValue:         pValue,
		Tau:            tau,
		Significance:   significance,
		TrendDirection: direction,
	}, nil
}
