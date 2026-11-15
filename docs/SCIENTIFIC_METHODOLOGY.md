# Scientific Methodology — TREND-X Engine

POLLO's analytical core, **TREND-X**, is built on statistically robust, non-parametric methods designed specifically for non-normally distributed, seasonally variable, and serially autocorrelated Earth observation time series.

---

## 1. Non-Parametric Trend Detection: Mann-Kendall Test

The Mann-Kendall test evaluates whether there is a monotonic upward or downward trend over time. Being non-parametric, it makes no assumptions regarding data normality and is resilient against missing observations and extreme outliers.

### 1.1 The $S$ Statistic
Given a time series $x_1, x_2, \dots, x_n$:

$$S = \sum_{k=1}^{n-1} \sum_{j=k+1}^{n} \operatorname{sgn}(x_j - x_k)$$

Where:
$$\operatorname{sgn}(\theta) = \begin{cases} +1 & \text{if } \theta > 0 \\ 0 & \text{if } \theta = 0 \\ -1 & \text{if } \theta < 0 \end{cases}$$

### 1.2 Variance with Tie Correction
When identical values (ties) exist in the dataset:

$$\operatorname{Var}(S) = \frac{1}{18} \left[ n(n-1)(2n+5) - \sum_{p=1}^{g} t_p(t_p-1)(2t_p+5) \right]$$

where $g$ is the number of tied groups and $t_p$ is the number of data points in the $p$-th group.

### 1.3 Standardized Test Statistic $Z$
For $n > 10$, the standardized normal statistic $Z$ is calculated:

$$Z = \begin{cases} \frac{S - 1}{\sqrt{\operatorname{Var}(S)}} & \text{if } S > 0 \\ 0 & \text{if } S = 0 \\ \frac{S + 1}{\sqrt{\operatorname{Var}(S)}} & \text{if } S < 0 \end{cases}$$

### 1.4 Statistical Significance ($p$-value)
A two-tailed $p$-value is derived using the standard normal cumulative distribution function $\Phi(z)$:

$$p = 2 \times \left(1 - \Phi(|Z|)\right)$$

- **Significant Trend:** $p \le 0.05$ (95% confidence level)
- **Marginal Trend:** $0.05 < p \le 0.10$
- **No Detectable Trend:** $p > 0.10$

---

## 2. Trend Magnitude: Sen's Slope Estimator

To quantify the physical rate of change (e.g., mm/year or °C/decade), POLLO uses Sen's robust slope estimator:

$$Q_i = \frac{x_j - x_k}{j - k} \quad \text{for all } 1 \le k < j \le n$$

For $N = \frac{n(n-1)}{2}$ calculated slopes, Sen's slope estimator $\beta$ is the median:

$$\beta = \operatorname{median}(Q)$$

The physical units of $\beta$ correspond directly to measurement units per unit of time (e.g., mm precipitation per year, °C surface temperature per decade).

---

## 3. Deseasonalization & Anomaly Indices

To prevent annual seasonal cycles (e.g., monsoonal wet/dry seasons or summer/winter temperature shifts) from obscuring multi-decadal trends:
1. **Climatological Baseline ($\mu_m, \sigma_m$):** Calculated for each month $m \in \{1,\dots,12\}$ across the reference baseline period (2000–2020).
2. **Standardized Anomaly ($Z_{t,m}$):**
   $$Z_{t,m} = \frac{x_{t,m} - \mu_m}{\sigma_m}$$
3. **Deseasonalized Series:**
   $$x^{\text{deseas}}_{t,m} = x_{t,m} - \mu_m$$

---

## 4. Divergence Detector

The Divergence Detector systematically pairs geographical regions and computes the divergence metric $\Delta$:

$$\Delta(R_A, R_B) = \operatorname{sgn}(\beta_A) \times \operatorname{sgn}(\beta_B) \times |\beta_A - \beta_B|$$

Regions exhibit **Bipolar Divergence** when:
$$\operatorname{sgn}(\beta_A) \ne \operatorname{sgn}(\beta_B) \quad \text{and} \quad p_A \le 0.05, \, p_B \le 0.05$$

---

## 5. Scientific Validation & Ground-Truth Verification

To ensure publication-grade numerical rigor and statistical reliability, POLLO's TREND-X calculations are automatically benchmarked against peer-reviewed reference implementations:
- **Gilbert (1987)** *Statistical Methods for Environmental Pollution Monitoring* (standard hydrological monitoring datasets, tied variance formulations).
- **Hirsch, Slack & Smith (1982)** *Techniques of Trend Analysis for Monthly Water Quality Data* (Seasonal Kendall benchmarks, deseasonalization sensitivity validation).
- **Python `pymannkendall` & `scipy.stats`** (`kendalltau`, `theilslopes`, `siegelslopes`).
- **R `trend` package** (`mk.test`, `sens.slope`, `sea.ken`).

### 5.1 Verification Test Matrix & Tolerances

| Test Category | Benchmark Reference | Verification Metrics | Numerical Tolerance |
|---|---|---|---|
| **Mann-Kendall Hydrological Benchmarks** | Gilbert (1987) Tables 16.2 & 16.3; 15-pt WQ series | $S$, $\operatorname{Var}(S)$ with tie correction, $Z$, two-tailed $p$-value | $\le 10^{-6}$ |
| **Seasonal Kendall & Deseasonalization** | Hirsch, Slack & Smith (1982) 36-month hydrological series | $S_{\text{seasonal}}$, $\operatorname{Var}(S_{\text{seasonal}})$, $Z$, $p$, anomaly isolation | $\le 10^{-6}$ |
| **High Tie Frequency Datasets** | Synthetic series ($t_p > 5$, $t_p$ up to 10) | Tie correction term $\sum t_p(t_p-1)(2t_p+5)$, corrected $\operatorname{Var}(S)$ | Exact / $\le 10^{-6}$ |
| **Regime Step Shifts** | Synthetic abrupt shift series (upward & downward) | Detection sensitivity, $p \le 0.01$, bounded Sen's slope | $\le 10^{-6}$ |
| **Sen's Robust Slope Estimator** | `scipy.stats.theilslopes` & `scipy.stats.siegelslopes` | Linear rate $\beta$, breakdown point invariance with extreme outliers | $\le 10^{-6}$ |
| **Divergence Detector Rigor** | African Great Lakes vs Horn of Africa GPM_PRECIP | Opposing sign verification, $p \le 0.05$, divergence metric $\Delta$ | $\le 10^{-6}$ |

### 5.2 Automated CI Enforcement

Every pull request and build executes:
1. Automated Go test suite: `go test -v -run TestScientificValidation ./tests/...` in `backend/tests/scientific_validation_test.go`.
2. Python ground-truth verification engine: `python3 scripts/verify_scientific_validation.py` cross-verifying reference implementations.

