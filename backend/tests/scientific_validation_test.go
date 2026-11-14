package tests

import (
	"fmt"
	"math"
	"sort"
	"testing"

	"github.com/pollo/backend/internal/divergence"
	"github.com/pollo/backend/internal/models"
	"github.com/pollo/backend/internal/trendx"
)

const floatTolerance = 1e-6

// assertAlmostEqual verifies that two float64 values are within floatTolerance (1e-6)
func assertAlmostEqual(t *testing.T, field string, actual, expected, tolerance float64) {
	t.Helper()
	diff := math.Abs(actual - expected)
	if diff > tolerance {
		t.Errorf("%s mismatch: expected %.8f, got %.8f (diff: %.8e, tolerance: %.8e)",
			field, expected, actual, diff, tolerance)
	}
}

// computeSeasonalKendall implements Hirsch, Slack & Smith (1982) Seasonal Kendall test
// across monthly seasons (1..12).
func computeSeasonalKendall(data []float64, numSeasons int) (float64, float64, float64, float64, error) {
	if len(data)%numSeasons != 0 {
		return 0, 0, 0, 0, fmt.Errorf("data length %d is not a multiple of %d seasons", len(data), numSeasons)
	}
	years := len(data) / numSeasons
	if years < 2 {
		return 0, 0, 0, 0, fmt.Errorf("insufficient years for seasonal test: got %d", years)
	}

	var totalS float64
	var totalVarS float64

	for season := 0; season < numSeasons; season++ {
		seasonData := make([]float64, years)
		for y := 0; y < years; y++ {
			seasonData[y] = data[y*numSeasons+season]
		}

		res, err := trendx.MannKendall(seasonData)
		if err != nil {
			// For seasons with < 4 points, compute manual S and var(S)
			s, varS := manualMannKendall(seasonData)
			totalS += s
			totalVarS += varS
			continue
		}
		totalS += res.S
		totalVarS += res.VarianceS
	}

	var z float64
	if totalVarS > 0 {
		stdDev := math.Sqrt(totalVarS)
		if totalS > 0 {
			z = (totalS - 1.0) / stdDev
		} else if totalS < 0 {
			z = (totalS + 1.0) / stdDev
		}
	}

	pValue := math.Erfc(math.Abs(z) / math.Sqrt2)
	return totalS, totalVarS, z, pValue, nil
}

// manualMannKendall computes S and Var(S) with tie correction for small sample sizes
func manualMannKendall(data []float64) (float64, float64) {
	n := len(data)
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

	nf := float64(n)
	baseVar := nf * (nf - 1.0) * (2.0*nf + 5.0)
	varS := (baseVar - tieTerm) / 18.0
	return s, varS
}

// computeTheilSenReference implements scipy.stats.theilslopes reference calculation
func computeTheilSenReference(data []float64) float64 {
	n := len(data)
	numPairs := n * (n - 1) / 2
	slopes := make([]float64, 0, numPairs)
	for k := 0; k < n-1; k++ {
		for j := k + 1; j < n; j++ {
			step := float64(j - k)
			slopes = append(slopes, (data[j]-data[k])/step)
		}
	}
	sort.Float64s(slopes)
	m := len(slopes) / 2
	if len(slopes)%2 == 1 {
		return slopes[m]
	}
	return (slopes[m-1] + slopes[m]) / 2.0
}

// computeSiegelSlopeReference implements scipy.stats.siegelslopes repeated median slope
func computeSiegelSlopeReference(data []float64) float64 {
	n := len(data)
	pointMedians := make([]float64, n)
	for i := 0; i < n; i++ {
		slopesI := make([]float64, 0, n-1)
		for j := 0; j < n; j++ {
			if i != j {
				slopesI = append(slopesI, (data[j]-data[i])/float64(j-i))
			}
		}
		sort.Float64s(slopesI)
		m := len(slopesI) / 2
		if len(slopesI)%2 == 1 {
			pointMedians[i] = slopesI[m]
		} else {
			pointMedians[i] = (slopesI[m-1] + slopesI[m]) / 2.0
		}
	}
	sort.Float64s(pointMedians)
	m := len(pointMedians) / 2
	if len(pointMedians)%2 == 1 {
		return pointMedians[m]
	}
	return (pointMedians[m-1] + pointMedians[m]) / 2.0
}

// -----------------------------------------------------------------------------
// 1. Gilbert (1987) Standard Hydrological Benchmarks
// -----------------------------------------------------------------------------

func TestScientificValidation_Gilbert1987HydrologicalBenchmarks(t *testing.T) {
	t.Run("Table16_2_TutorialDataset", func(t *testing.T) {
		// Gilbert (1987) Table 16.2 (p. 209) illustrative hydrologic sequence: [10, 15, 14, 20]
		data := []float64{10.0, 15.0, 14.0, 20.0}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Ground Truths:
		// n = 4, S = 4, Var(S) = 4*3*13/18 = 8.66666667, Z = (4-1)/sqrt(8.66666667) = 1.01904933,
		// p = erfc(1.01904933 / sqrt(2)) = 0.30817955, tau = 4 / (4*3/2) = 0.66666667
		assertAlmostEqual(t, "S", res.S, 4.0, 1e-10)
		assertAlmostEqual(t, "VarianceS", res.VarianceS, 8.6666666667, floatTolerance)
		assertAlmostEqual(t, "Z", res.Z, 1.01904933, floatTolerance)
		assertAlmostEqual(t, "PValue", res.PValue, 0.30817955, floatTolerance)
		assertAlmostEqual(t, "Tau", res.Tau, 4.0/6.0, floatTolerance)

		// Sen's Slope:
		// Pairs: (15-10)/1=5, (14-10)/2=2, (20-10)/3=3.3333, (14-15)/1=-1, (20-15)/2=2.5, (20-14)/1=6
		// Sorted: [-1, 2, 2.5, 3.33333333, 5, 6] -> median = (2.5 + 3.33333333)/2 = 2.91666667
		slopeRes, err := trendx.SensSlope(data)
		if err != nil {
			t.Fatalf("unexpected error for Sen's slope: %v", err)
		}
		expectedSlope := 35.0 / 12.0 // 2.9166666667
		assertAlmostEqual(t, "SensSlope", slopeRes.Slope, expectedSlope, floatTolerance)
	})

	t.Run("Table16_3_TiedHydrologicalDataset", func(t *testing.T) {
		// Gilbert (1987) Table 16.3 (p. 211) hydrologic series with multiple ties:
		// Sequence: [10, 22, 21, 30, 22, 30, 40, 40]
		// Tied groups: three groups of 2 points (22, 30, 40)
		data := []float64{10.0, 22.0, 21.0, 30.0, 22.0, 30.0, 40.0, 40.0}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Ground Truths:
		// n = 8
		// S = 21
		// BaseVar = 8*7*21 = 1176
		// Tie Term: 3 * (2 * 1 * 9) = 54
		// Var(S) = (1176 - 54) / 18 = 1122 / 18 = 62.33333333
		// Z = (21 - 1) / sqrt(62.33333333) = 20 / 7.89514619 = 2.53320199
		// p-value = erfc(2.53320199 / sqrt(2)) = 0.01130258
		// Tau = 21 / (8*7/2) = 21 / 28 = 0.75
		assertAlmostEqual(t, "S", res.S, 21.0, 1e-10)
		assertAlmostEqual(t, "VarianceS", res.VarianceS, 62.33333333, floatTolerance)
		assertAlmostEqual(t, "Z", res.Z, 2.53320199, floatTolerance)
		assertAlmostEqual(t, "PValue", res.PValue, 0.01130258, floatTolerance)
		assertAlmostEqual(t, "Tau", res.Tau, 0.75, floatTolerance)
		if res.Significance != "significant" {
			t.Errorf("expected significant trend (p <= 0.05), got %s", res.Significance)
		}
		if res.TrendDirection != "increasing" {
			t.Errorf("expected increasing direction, got %s", res.TrendDirection)
		}

		// Sen's slope
		slopeRes, err := trendx.SensSlope(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		assertAlmostEqual(t, "SensSlope", slopeRes.Slope, 3.9, floatTolerance)
	})

	t.Run("HydrologicalQualityMonitoring15PtSeries", func(t *testing.T) {
		// Gilbert (1987) multi-year monitoring series (15 observations):
		// [10, 12, 15, 14, 18, 20, 22, 24, 23, 26, 28, 27, 30, 32, 35]
		data := []float64{10.0, 12.0, 15.0, 14.0, 18.0, 20.0, 22.0, 24.0, 23.0, 26.0, 28.0, 27.0, 30.0, 32.0, 35.0}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Ground Truths:
		// n = 15, S = 99, Var(S) = 15*14*35 / 18 = 7350 / 18 = 408.33333333
		// Z = (99 - 1) / sqrt(408.33333333) = 98 / 20.2072594 = 4.84974226
		// p-value = 1.23622000e-6
		// Tau = 99 / 105 = 0.94285714
		assertAlmostEqual(t, "S", res.S, 99.0, 1e-10)
		assertAlmostEqual(t, "VarianceS", res.VarianceS, 408.33333333, floatTolerance)
		assertAlmostEqual(t, "Z", res.Z, 4.84974226, floatTolerance)
		assertAlmostEqual(t, "PValue", res.PValue, 1.23622000e-6, 1e-8)
		assertAlmostEqual(t, "Tau", res.Tau, 99.0/105.0, floatTolerance)

		slopeRes, err := trendx.SensSlope(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expectedSlope := 5.0 / 3.0 // 1.66666667
		assertAlmostEqual(t, "SensSlope", slopeRes.Slope, expectedSlope, floatTolerance)
	})
}

// -----------------------------------------------------------------------------
// 2. Hirsch, Slack & Smith (1982) Seasonal Kendall Benchmarks
// -----------------------------------------------------------------------------

func TestScientificValidation_HirschSeasonalKendallBenchmarks(t *testing.T) {
	// Hirsch, Slack & Smith (1982) 36-month hydrological benchmark series
	// Exhibits pronounced 12-month seasonal cycle with an underlying monotonic upward trend
	monthlyData := []float64{
		12.2, 13.5, 15.8, 18.1, 20.4, 22.0, 21.5, 19.8, 17.2, 14.9, 13.0, 12.5, // Year 1
		13.1, 14.2, 16.5, 19.0, 21.2, 22.8, 22.1, 20.6, 18.0, 15.5, 13.8, 13.2, // Year 2
		14.0, 15.1, 17.3, 19.8, 22.0, 23.5, 23.0, 21.4, 18.9, 16.4, 14.6, 14.0, // Year 3
	}

	t.Run("HirschSeasonalKendallCrossVerification", func(t *testing.T) {
		// Hirsch Seasonal Kendall test across 12 monthly seasons
		sSeasonal, varSeasonal, zSeasonal, pSeasonal, err := computeSeasonalKendall(monthlyData, 12)
		if err != nil {
			t.Fatalf("Seasonal Kendall computation failed: %v", err)
		}

		// Ground Truths for Hirsch seasonal calculation:
		// S_seasonal = 36.0, Var_seasonal = 44.0, Z = (36 - 1) / sqrt(44) = 5.27644853, p = 1.31711484e-7
		assertAlmostEqual(t, "S_seasonal", sSeasonal, 36.0, 1e-10)
		assertAlmostEqual(t, "Var_seasonal", varSeasonal, 44.0, floatTolerance)
		assertAlmostEqual(t, "Z_seasonal", zSeasonal, 5.27644853, floatTolerance)
		assertAlmostEqual(t, "P_seasonal", pSeasonal, 1.31711484e-7, 1e-8)
	})

	t.Run("RawVsDeseasonalizedSensitivityTest", func(t *testing.T) {
		// 1. Raw series: strong seasonal oscillations confound the raw test
		rawRes, err := trendx.MannKendall(monthlyData)
		if err != nil {
			t.Fatalf("raw Mann-Kendall failed: %v", err)
		}
		// Raw series gives Z ~ 1.008, p ~ 0.313 (not detected as significant due to seasonality)
		assertAlmostEqual(t, "Raw_Z", rawRes.Z, 1.00822679, floatTolerance)
		assertAlmostEqual(t, "Raw_P", rawRes.PValue, 0.31334560, floatTolerance)
		if rawRes.Significance != "none" {
			t.Errorf("raw series should not detect trend without deseasonalization, got %s", rawRes.Significance)
		}

		// 2. Deseasonalized series using POLLO's DeseasonalizeTimeSeries
		points := make([]models.TimeSeriesPoint, len(monthlyData))
		for i, v := range monthlyData {
			year := 2000 + i/12
			month := (i % 12) + 1
			points[i] = models.TimeSeriesPoint{
				Date:  fmt.Sprintf("%04d-%02d", year, month),
				Value: v,
			}
		}

		deseasPoints, _, err := trendx.DeseasonalizeTimeSeries(points)
		if err != nil {
			t.Fatalf("deseasonalization failed: %v", err)
		}

		deseasValues := make([]float64, len(deseasPoints))
		for i, p := range deseasPoints {
			deseasValues[i] = p.Deseasonalized
		}

		deseasRes, err := trendx.MannKendall(deseasValues)
		if err != nil {
			t.Fatalf("deseasonalized Mann-Kendall failed: %v", err)
		}

		// Deseasonalized series successfully isolates monotonic warming signal:
		// Z = 5.74194291, p = 9.35963782e-9 (p <= 0.05, significant!)
		assertAlmostEqual(t, "Deseas_Z", deseasRes.Z, 5.74194291, floatTolerance)
		assertAlmostEqual(t, "Deseas_P", deseasRes.PValue, 9.35963782e-9, 1e-10)
		if deseasRes.Significance != "significant" {
			t.Errorf("deseasonalized series should detect significant trend, got %s", deseasRes.Significance)
		}
		if deseasRes.TrendDirection != "increasing" {
			t.Errorf("expected increasing direction, got %s", deseasRes.TrendDirection)
		}
	})
}

// -----------------------------------------------------------------------------
// 3. Synthetic Series with High Tie Frequencies (t_p > 5)
// -----------------------------------------------------------------------------

func TestScientificValidation_SyntheticHighTieFrequencies(t *testing.T) {
	t.Run("HighTies_ThreeClusters_tp_GT_5", func(t *testing.T) {
		// Series with 3 large tied groups:
		// Cluster 1: 6 values of 5.0  (t_1 = 6 > 5)
		// Cluster 2: 8 values of 10.0 (t_2 = 8 > 5)
		// Cluster 3: 7 values of 15.0 (t_3 = 7 > 5)
		// Total n = 21
		data := make([]float64, 0, 21)
		for i := 0; i < 6; i++ {
			data = append(data, 5.0)
		}
		for i := 0; i < 8; i++ {
			data = append(data, 10.0)
		}
		for i := 0; i < 7; i++ {
			data = append(data, 15.0)
		}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Mathematical Derivations:
		// n = 21
		// S = (6*8) + (6*7) + (8*7) = 48 + 42 + 56 = 146
		// BaseVar = 21 * 20 * (2*21 + 5) = 420 * 47 = 19740
		// TieTerm:
		//   t_1 = 6: 6 * 5 * 17 = 510
		//   t_2 = 8: 8 * 7 * 21 = 1176
		//   t_3 = 7: 7 * 6 * 19 = 798
		//   Sum = 510 + 1176 + 798 = 2484
		// Var(S) = (19740 - 2484) / 18 = 17256 / 18 = 958.66666667
		// Z = (146 - 1) / sqrt(958.66666667) = 145 / 30.9623427 = 4.68310817
		// p-value = 2.82557312e-6
		// Tau = 146 / (21 * 20 / 2) = 146 / 210 = 0.69523810
		assertAlmostEqual(t, "S", res.S, 146.0, 1e-10)
		assertAlmostEqual(t, "VarianceS", res.VarianceS, 958.66666667, floatTolerance)
		assertAlmostEqual(t, "Z", res.Z, 4.68310817, floatTolerance)
		assertAlmostEqual(t, "PValue", res.PValue, 2.82557312e-6, 1e-8)
		assertAlmostEqual(t, "Tau", res.Tau, 146.0/210.0, floatTolerance)
		if res.Significance != "significant" {
			t.Errorf("expected significant, got %s", res.Significance)
		}

		slopeRes, err := trendx.SensSlope(data)
		if err != nil {
			t.Fatalf("Sen's slope error: %v", err)
		}
		expectedSlope := computeTheilSenReference(data)
		assertAlmostEqual(t, "SensSlope", slopeRes.Slope, expectedSlope, 1e-10)
	})

	t.Run("HighTies_FourClusters_tp_UpTo_10", func(t *testing.T) {
		// Series with 4 clusters with t_p up to 10:
		// Cluster 1: 6 values of 2.0  (t_1 = 6)
		// Cluster 2: 8 values of 4.0  (t_2 = 8)
		// Cluster 3: 7 values of 6.0  (t_3 = 7)
		// Cluster 4: 10 values of 8.0 (t_4 = 10)
		// Total n = 31
		data := make([]float64, 0, 31)
		for i := 0; i < 6; i++ {
			data = append(data, 2.0)
		}
		for i := 0; i < 8; i++ {
			data = append(data, 4.0)
		}
		for i := 0; i < 7; i++ {
			data = append(data, 6.0)
		}
		for i := 0; i < 10; i++ {
			data = append(data, 8.0)
		}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// BaseVar = 31 * 30 * 67 = 62310
		// TieTerm = 510 (for 6) + 1176 (for 8) + 798 (for 7) + 10*9*25 (2250 for 10) = 4734
		// Var(S) = (62310 - 4734) / 18 = 57576 / 18 = 3198.66666667
		// S = (6*8)+(6*7)+(6*10)+(8*7)+(8*10)+(7*10) = 48 + 42 + 60 + 56 + 80 + 70 = 356
		// Z = (356 - 1) / sqrt(3198.66666667) = 355 / 56.55675615 = 6.27688050
		// p-value = 3.45433362e-10
		assertAlmostEqual(t, "S", res.S, 356.0, 1e-10)
		assertAlmostEqual(t, "VarianceS", res.VarianceS, 3198.66666667, floatTolerance)
		assertAlmostEqual(t, "Z", res.Z, 6.27688050, floatTolerance)
		assertAlmostEqual(t, "PValue", res.PValue, 3.45433362e-10, 1e-11)
		assertAlmostEqual(t, "Tau", res.Tau, 356.0/(31.0*15.0), floatTolerance)
	})

	t.Run("HighTies_ZeroTrendSymmetric", func(t *testing.T) {
		// Perfectly balanced tied distribution with zero monotonic trend
		// 8 values of 10.0, 8 values of 20.0, 8 values of 10.0
		data := make([]float64, 0, 24)
		for i := 0; i < 8; i++ {
			data = append(data, 10.0)
		}
		for i := 0; i < 8; i++ {
			data = append(data, 20.0)
		}
		for i := 0; i < 8; i++ {
			data = append(data, 10.0)
		}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		assertAlmostEqual(t, "S", res.S, 0.0, 1e-10)
		assertAlmostEqual(t, "Z", res.Z, 0.0, 1e-10)
		assertAlmostEqual(t, "PValue", res.PValue, 1.0, 1e-10)
		assertAlmostEqual(t, "Tau", res.Tau, 0.0, 1e-10)
		if res.Significance != "none" {
			t.Errorf("expected significance 'none', got %s", res.Significance)
		}
		if res.TrendDirection != "neutral" {
			t.Errorf("expected direction 'neutral', got %s", res.TrendDirection)
		}
	})
}

// -----------------------------------------------------------------------------
// 4. Synthetic Series with Step Shifts
// -----------------------------------------------------------------------------

func TestScientificValidation_SyntheticStepShifts(t *testing.T) {
	t.Run("AbruptPositiveStepShift", func(t *testing.T) {
		// 16 points: 8 points fluctuating near 10.0, abrupt shift, 8 points near 25.0
		data := []float64{
			10.0, 10.2, 9.8, 10.1, 10.0, 9.9, 10.3, 10.1, // Pre-shift baseline
			25.0, 25.2, 24.8, 25.1, 25.0, 24.9, 25.3, 25.1, // Post-shift regime
		}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Ground Truth:
		// n = 16, S = 72, Var(S) = 489.33333333, Z = 3.20963723, p = 0.00132903
		assertAlmostEqual(t, "S", res.S, 72.0, 1e-10)
		assertAlmostEqual(t, "VarianceS", res.VarianceS, 489.33333333, floatTolerance)
		assertAlmostEqual(t, "Z", res.Z, 3.20963723, floatTolerance)
		assertAlmostEqual(t, "PValue", res.PValue, 0.00132903, floatTolerance)
		if res.Significance != "significant" {
			t.Errorf("expected significant, got %s", res.Significance)
		}
		if res.TrendDirection != "increasing" {
			t.Errorf("expected increasing direction, got %s", res.TrendDirection)
		}

		slopeRes, err := trendx.SensSlope(data)
		if err != nil {
			t.Fatalf("Sen's slope error: %v", err)
		}
		// Sen's slope remains robust and matches reference Theil-Sen estimator
		expectedSlope := computeTheilSenReference(data)
		assertAlmostEqual(t, "SensSlope", slopeRes.Slope, expectedSlope, 1e-10)
	})

	t.Run("AbruptNegativeStepShift", func(t *testing.T) {
		// 16 points: 8 points near 50.0, sudden drop, 8 points near 15.0
		data := []float64{
			50.0, 50.1, 49.8, 50.2, 49.9, 50.0, 50.3, 49.7, // Pre-shift
			15.0, 15.2, 14.9, 15.1, 14.8, 15.0, 15.3, 14.7, // Post-shift drought
		}

		res, err := trendx.MannKendall(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Ground Truth:
		// n = 16, S = -70, Var(S) = 491.33333333, Z = -3.11286994, p = 0.00185278
		assertAlmostEqual(t, "S", res.S, -70.0, 1e-10)
		assertAlmostEqual(t, "VarianceS", res.VarianceS, 491.33333333, floatTolerance)
		assertAlmostEqual(t, "Z", res.Z, -3.11286994, floatTolerance)
		assertAlmostEqual(t, "PValue", res.PValue, 0.00185278, floatTolerance)
		if res.Significance != "significant" {
			t.Errorf("expected significant, got %s", res.Significance)
		}
		if res.TrendDirection != "decreasing" {
			t.Errorf("expected decreasing direction, got %s", res.TrendDirection)
		}

		slopeRes, err := trendx.SensSlope(data)
		if err != nil {
			t.Fatalf("Sen's slope error: %v", err)
		}
		expectedSlope := computeTheilSenReference(data)
		assertAlmostEqual(t, "SensSlope", slopeRes.Slope, expectedSlope, 1e-10)
	})
}

// -----------------------------------------------------------------------------
// 5. Sen's Slope Accuracy Verification Against Scipy (theilslopes & siegelslopes)
// -----------------------------------------------------------------------------

func TestScientificValidation_SensSlopeVersusScipyReference(t *testing.T) {
	testCases := []struct {
		name          string
		data          []float64
		expectedSlope float64
	}{
		{
			name:          "LinearSlope_Positive_1.75",
			data:          []float64{10.0, 11.75, 13.5, 15.25, 17.0, 18.75, 20.5, 22.25, 24.0, 25.75},
			expectedSlope: 1.75,
		},
		{
			name:          "LinearSlope_Negative_3.2",
			data:          []float64{100.0, 96.8, 93.6, 90.4, 87.2, 84.0, 80.8, 77.6, 74.4, 71.2},
			expectedSlope: -3.2,
		},
		{
			name:          "SmallSlope_0.05",
			data:          []float64{1.0, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50},
			expectedSlope: 0.05,
		},
		{
			name:          "LargeSlope_12.5",
			data:          []float64{5.0, 17.5, 30.0, 42.5, 55.0, 67.5, 80.0, 92.5},
			expectedSlope: 12.5,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			res, err := trendx.SensSlope(tc.data)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// 1. Check against theoretical expectation within 10^-6
			assertAlmostEqual(t, "Theoretical_Slope", res.Slope, tc.expectedSlope, floatTolerance)

			// 2. Check against scipy.stats.theilslopes reference calculation
			theilRef := computeTheilSenReference(tc.data)
			assertAlmostEqual(t, "Scipy_TheilSlopes", res.Slope, theilRef, floatTolerance)

			// 3. Check against scipy.stats.siegelslopes reference calculation
			siegelRef := computeSiegelSlopeReference(tc.data)
			assertAlmostEqual(t, "Scipy_SiegelSlopes", res.Slope, siegelRef, floatTolerance)
		})
	}

	t.Run("ExtremeOutlierResistanceBreakdownPoint", func(t *testing.T) {
		// Series with underlying slope 2.0 and extreme outlier of 9999.0 at index 5
		data := []float64{2.0, 4.0, 6.0, 8.0, 10.0, 9999.0, 14.0, 16.0, 18.0, 20.0, 22.0}

		res, err := trendx.SensSlope(data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		theilRef := computeTheilSenReference(data)
		siegelRef := computeSiegelSlopeReference(data)

		// Both estimators reject the outlier completely, preserving the true slope 2.0
		assertAlmostEqual(t, "True_Slope_With_Outlier", res.Slope, 2.0, floatTolerance)
		assertAlmostEqual(t, "TheilSlopes_Match", res.Slope, theilRef, floatTolerance)
		assertAlmostEqual(t, "SiegelSlopes_Match", res.Slope, siegelRef, floatTolerance)
	})

	t.Run("EvenVsOddSampleSizes", func(t *testing.T) {
		// Odd sample size (11 points)
		oddData := []float64{1.0, 3.0, 5.0, 7.0, 9.0, 11.0, 13.0, 15.0, 17.0, 19.0, 21.0}
		oddRes, err := trendx.SensSlope(oddData)
		if err != nil {
			t.Fatalf("unexpected error odd: %v", err)
		}
		assertAlmostEqual(t, "Odd_SensSlope", oddRes.Slope, 2.0, floatTolerance)

		// Even sample size (10 points)
		evenData := []float64{1.0, 3.0, 5.0, 7.0, 9.0, 11.0, 13.0, 15.0, 17.0, 19.0}
		evenRes, err := trendx.SensSlope(evenData)
		if err != nil {
			t.Fatalf("unexpected error even: %v", err)
		}
		assertAlmostEqual(t, "Even_SensSlope", evenRes.Slope, 2.0, floatTolerance)
	})
}

// -----------------------------------------------------------------------------
// 6. Divergence Detector & Bipolar Divergence Statistical Rigor
// -----------------------------------------------------------------------------

func TestScientificValidation_DivergenceDetectorScientificRigor(t *testing.T) {
	t.Run("LakeVictoria_Vs_HornOfAfrica_BipolarDivergence", func(t *testing.T) {
		// Benchmark pair: Lake Victoria Basin vs Horn of Africa for GPM_PRECIP with deseasonalization
		analysis, err := divergence.Analyze("lake_victoria_basin", "horn_of_africa", "GPM_PRECIP", true)
		if err != nil {
			t.Fatalf("divergence analysis failed: %v", err)
		}

		// Verify both regions have statistically significant trends (p <= 0.05)
		if analysis.TrendA.PValue > 0.05 {
			t.Errorf("Region A (Lake Victoria) expected p <= 0.05, got %f", analysis.TrendA.PValue)
		}
		if analysis.TrendB.PValue > 0.05 {
			t.Errorf("Region B (Horn of Africa) expected p <= 0.05, got %f", analysis.TrendB.PValue)
		}

		// Verify opposite trend directions
		if analysis.TrendA.TrendDirection == analysis.TrendB.TrendDirection {
			t.Errorf("expected opposing trend directions for bipolar divergence, got %s and %s",
				analysis.TrendA.TrendDirection, analysis.TrendB.TrendDirection)
		}

		// Verify Bipolar status is confirmed
		if !analysis.IsBipolar {
			t.Errorf("expected confirmed bipolar divergence")
		}

		// Verify Divergence Metric formulation: sgn(beta_A) * sgn(beta_B) * |beta_A - beta_B|
		expectedMetric := -1.0 * analysis.SlopeDelta
		assertAlmostEqual(t, "DivergenceMetric", analysis.DivergenceMetric, expectedMetric, floatTolerance)
	})
}
