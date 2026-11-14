package divergence

import (
	"fmt"
	"math"

	"github.com/pollo/backend/internal/data"
	"github.com/pollo/backend/internal/models"
	"github.com/pollo/backend/internal/trendx"
)

// Analyze computes paired regional contrast and bipolar divergence metrics
func Analyze(regionAID, regionBID, variableID string, deseasonalize bool) (*models.DivergenceAnalysis, error) {
	regA, okA := data.GetRegion(regionAID)
	if !okA {
		return nil, fmt.Errorf("region A not found: %s", regionAID)
	}
	regB, okB := data.GetRegion(regionBID)
	if !okB {
		return nil, fmt.Errorf("region B not found: %s", regionBID)
	}
	variable, okV := data.GetVariable(variableID)
	if !okV {
		return nil, fmt.Errorf("variable not found: %s", variableID)
	}

	// 1. Generate & process timeseries for Region A
	pointsA, err := data.GenerateBenchmarkTimeSeries(regionAID, variableID)
	if err != nil {
		return nil, fmt.Errorf("failed generating series for %s: %w", regionAID, err)
	}
	var dataValsA []float64
	if deseasonalize {
		deseasA, _, err := trendx.DeseasonalizeTimeSeries(pointsA)
		if err != nil {
			return nil, err
		}
		dataValsA = make([]float64, len(deseasA))
		for i, p := range deseasA {
			dataValsA[i] = p.Anomaly
		}
	} else {
		dataValsA = make([]float64, len(pointsA))
		for i, p := range pointsA {
			dataValsA[i] = p.Value
		}
	}

	mkA, err := trendx.MannKendall(dataValsA)
	if err != nil {
		return nil, err
	}
	sensA, err := trendx.SensSlope(dataValsA)
	if err != nil {
		return nil, err
	}

	trendA := models.TrendResult{
		VariableID:     variableID,
		RegionID:       regionAID,
		DataPoints:     mkA.N,
		StartDate:      pointsA[0].Date,
		EndDate:        pointsA[len(pointsA)-1].Date,
		S:              mkA.S,
		VarianceS:      mkA.VarianceS,
		Z:              mkA.Z,
		PValue:         mkA.PValue,
		Tau:            mkA.Tau,
		SensSlope:      sensA.Slope,
		AnnualRate:     sensA.AnnualRate,
		Units:          variable.Units,
		Significance:   mkA.Significance,
		TrendDirection: mkA.TrendDirection,
		Interpretation: fmt.Sprintf("%s shows an %s trend (Rate: %+.3f %s/yr, p=%.4e)", regA.Name, mkA.TrendDirection, sensA.AnnualRate, variable.Units, mkA.PValue),
	}

	// 2. Generate & process timeseries for Region B
	pointsB, err := data.GenerateBenchmarkTimeSeries(regionBID, variableID)
	if err != nil {
		return nil, fmt.Errorf("failed generating series for %s: %w", regionBID, err)
	}
	var dataValsB []float64
	if deseasonalize {
		deseasB, _, err := trendx.DeseasonalizeTimeSeries(pointsB)
		if err != nil {
			return nil, err
		}
		dataValsB = make([]float64, len(deseasB))
		for i, p := range deseasB {
			dataValsB[i] = p.Anomaly
		}
	} else {
		dataValsB = make([]float64, len(pointsB))
		for i, p := range pointsB {
			dataValsB[i] = p.Value
		}
	}

	mkB, err := trendx.MannKendall(dataValsB)
	if err != nil {
		return nil, err
	}
	sensB, err := trendx.SensSlope(dataValsB)
	if err != nil {
		return nil, err
	}

	trendB := models.TrendResult{
		VariableID:     variableID,
		RegionID:       regionBID,
		DataPoints:     mkB.N,
		StartDate:      pointsB[0].Date,
		EndDate:        pointsB[len(pointsB)-1].Date,
		S:              mkB.S,
		VarianceS:      mkB.VarianceS,
		Z:              mkB.Z,
		PValue:         mkB.PValue,
		Tau:            mkB.Tau,
		SensSlope:      sensB.Slope,
		AnnualRate:     sensB.AnnualRate,
		Units:          variable.Units,
		Significance:   mkB.Significance,
		TrendDirection: mkB.TrendDirection,
		Interpretation: fmt.Sprintf("%s shows a %s trend (Rate: %+.3f %s/yr, p=%.4e)", regB.Name, mkB.TrendDirection, sensB.AnnualRate, variable.Units, mkB.PValue),
	}

	// 3. Compute Divergence Metrics
	sgnA := sgn(trendA.SensSlope)
	sgnB := sgn(trendB.SensSlope)
	slopeDelta := math.Abs(trendA.AnnualRate - trendB.AnnualRate)
	divergenceMetric := float64(sgnA*sgnB) * slopeDelta

	// Bipolar divergence: opposite signs, both statistically significant (p <= 0.05)
	isBipolar := (sgnA != sgnB) && (sgnA != 0 && sgnB != 0) && (mkA.PValue <= 0.05) && (mkB.PValue <= 0.05)

	var summary string
	if isBipolar {
		summary = fmt.Sprintf("CONFIRMED BIPOLAR DIVERGENCE: %s exhibits an %s trend (%+.2f %s/yr, p=%.3e) while %s exhibits a %s trend (%+.2f %s/yr, p=%.3e). Divergence rate delta: %.2f %s/yr.",
			regA.Name, trendA.TrendDirection, trendA.AnnualRate, variable.Units, trendA.PValue,
			regB.Name, trendB.TrendDirection, trendB.AnnualRate, variable.Units, trendB.PValue,
			slopeDelta, variable.Units)
	} else if math.Abs(trendA.AnnualRate-trendB.AnnualRate) > 0.5 {
		summary = fmt.Sprintf("ASYMMETRIC EVOLUTION: Significant difference in trajectory rate (Δ=%.2f %s/yr) between %s and %s, but trajectories do not form opposed bipolar signs.",
			slopeDelta, variable.Units, regA.Name, regB.Name)
	} else {
		summary = fmt.Sprintf("CONCORDANT EVOLUTION: %s and %s display coherent regional trajectories.", regA.Name, regB.Name)
	}

	return &models.DivergenceAnalysis{
		VariableID:        variableID,
		RegionA:           *regA,
		RegionB:           *regB,
		TrendA:            trendA,
		TrendB:            trendB,
		SlopeDelta:        slopeDelta,
		DivergenceMetric:  divergenceMetric,
		IsBipolar:         isBipolar,
		ScientificSummary: summary,
	}, nil
}

func sgn(val float64) int {
	if val > 1e-9 {
		return 1
	} else if val < -1e-9 {
		return -1
	}
	return 0
}
