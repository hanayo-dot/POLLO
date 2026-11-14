package geospatial

import (
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/pollo/backend/internal/models"
)

// Standard NASA and Earth Observation Grid Resolutions
var (
	// ResGPM01 represents 0.1° (~10 km) resolution for GPM IMERG V07 precipitation.
	ResGPM01 = GridResolution{Name: "0.1° (~10 km)", CRS: CRS_EPSG4326, Unit: "degree", Dx: 0.1, Dy: 0.1}

	// ResMERRA2 represents 0.5° x 0.625° resolution for MERRA-2 GMAO reanalysis.
	ResMERRA2 = GridResolution{Name: "0.5° × 0.625°", CRS: CRS_EPSG4326, Unit: "degree", Dx: 0.625, Dy: 0.5}

	// ResMERRA2Square represents regular 0.5° resolution.
	ResMERRA2Square = GridResolution{Name: "0.5°", CRS: CRS_EPSG4326, Unit: "degree", Dx: 0.5, Dy: 0.5}

	// ResSMAP9kmEASE2 represents the true SMAP L4 EASE-Grid 2.0 Global projection (EPSG:6933).
	// Uses standard 9,024.13066 m cell spacing in projected Lambert Cylindrical Equal-Area coordinates.
	ResSMAP9kmEASE2 = GridResolution{
		Name: "9 km EASE-Grid 2.0 (EPSG:6933)",
		CRS:  CRS_EPSG6933,
		Unit: "metre",
		Dx:   9024.13066,
		Dy:   9024.13066,
	}

	// ResSMAP9km is the primary SMAP resolution pointing to the true EPSG:6933 equal-area specification.
	ResSMAP9km = ResSMAP9kmEASE2

	// ResSMAP9kmApproxGeog represents an unprojected geographic degree approximation at the equator.
	// NOTE: This is an unprojected approximation in EPSG:4326 (~0.08085°), NOT the actual EPSG:6933 EASE-Grid.
	// It is retained for backward compatibility with unprojected geographic workflows.
	ResSMAP9kmApproxGeog = GridResolution{
		Name: "9 km Approx Geographic (EPSG:4326)",
		CRS:  CRS_EPSG4326,
		Unit: "degree",
		Dx:   9.0 / 111.32,
		Dy:   9.0 / 111.32,
	}

	// ResMODIS005 represents 0.05° (~5.6 km) resolution for MODIS Land Surface Temperature (MOD11C3).
	ResMODIS005 = GridResolution{Name: "0.05° (~5.6 km)", CRS: CRS_EPSG4326, Unit: "degree", Dx: 0.05, Dy: 0.05}
)

// Coordinate Reference System (CRS) identifiers
const (
	CRS_EPSG4326 = "EPSG:4326" // WGS 84 Geographic 2D (degrees lon/lat)
	CRS_EPSG6933 = "EPSG:6933" // WGS 84 / EASE-Grid 2.0 Global Cylindrical Equal-Area (meters)
)

// WGS 84 and EASE-Grid 2.0 projection constants
const (
	wgs84A = 6378137.0
	wgs84F = 1.0 / 298.257223563
)

var (
	ease2E2 = 2.0*wgs84F - wgs84F*wgs84F
	ease2E  = math.Sqrt(ease2E2)
	ease2M0 = math.Cos(30.0*math.Pi/180.0) / math.Sqrt(1.0-ease2E2*math.Sin(30.0*math.Pi/180.0)*math.Sin(30.0*math.Pi/180.0))
	ease2Qp = ease2Q(math.Pi / 2.0)
)

func ease2Q(phi float64) float64 {
	sinP := math.Sin(phi)
	sinP2 := sinP * sinP
	term1 := sinP / (1.0 - ease2E2*sinP2)
	term2 := (1.0 / (2.0 * ease2E)) * math.Log((1.0-ease2E*sinP)/(1.0+ease2E*sinP))
	return (1.0 - ease2E2) * (term1 - term2)
}

// ForwardEPSG6933 transforms a geographic Point (degrees lon/lat) into EPSG:6933 planar coordinates (meters X/Y).
func ForwardEPSG6933(p Point) (x, y float64, err error) {
	if err := p.Validate(); err != nil {
		return 0, 0, fmt.Errorf("invalid coordinate: %w", err)
	}
	lam := p.Lon * (math.Pi / 180.0)
	phi := p.Lat * (math.Pi / 180.0)
	x = wgs84A * ease2M0 * lam
	y = (wgs84A * ease2Q(phi)) / (2.0 * ease2M0)
	return x, y, nil
}

// InverseEPSG6933 transforms EPSG:6933 planar coordinates (meters X/Y) into a geographic Point (degrees lon/lat).
func InverseEPSG6933(x, y float64) (Point, error) {
	if math.IsNaN(x) || math.IsNaN(y) || math.IsInf(x, 0) || math.IsInf(y, 0) {
		return Point{}, errors.New("coordinates must be finite numbers")
	}
	lam := x / (wgs84A * ease2M0)
	q := (2.0 * ease2M0 * y) / wgs84A
	ratio := q / ease2Qp
	if ratio > 1.0 {
		ratio = 1.0
	} else if ratio < -1.0 {
		ratio = -1.0
	}
	phi := math.Asin(ratio)

	// Newton-Raphson iteration for geodetic latitude phi
	for iter := 0; iter < 5; iter++ {
		sinP := math.Sin(phi)
		cosP := math.Cos(phi)
		if math.Abs(cosP) < 1e-12 {
			break
		}
		con := ease2E * sinP
		term1 := sinP / (1.0 - ease2E2*sinP*sinP)
		term2 := (1.0 / (2.0 * ease2E)) * math.Log((1.0-con)/(1.0+con))
		qPhi := (1.0 - ease2E2) * (term1 - term2)
		dPhi := ((1.0 - ease2E2*sinP*sinP) * (1.0 - ease2E2*sinP*sinP) / (2.0 * cosP * (1.0 - ease2E2))) * (q - qPhi)
		phi += dPhi
		if math.Abs(dPhi) < 1e-12 {
			break
		}
	}

	lon := lam * (180.0 / math.Pi)
	lat := phi * (180.0 / math.Pi)

	if lon > 180.0 {
		lon = 180.0
	} else if lon < -180.0 {
		lon = -180.0
	}
	if lat > 90.0 {
		lat = 90.0
	} else if lat < -90.0 {
		lat = -90.0
	}

	return Point{Lon: lon, Lat: lat}, nil
}

// ProjectedBoundingBox encapsulates 2D planar bounding coordinates in meters for projected CRS.
type ProjectedBoundingBox struct {
	MinX float64 `json:"min_x"`
	MaxX float64 `json:"max_x"`
	MinY float64 `json:"min_y"`
	MaxY float64 `json:"max_y"`
}

// GridResolution encapsulates the spatial resolution and coordinate reference system.
type GridResolution struct {
	Name string  `json:"name"`
	CRS  string  `json:"crs"`  // "EPSG:4326" or "EPSG:6933"
	Unit string  `json:"unit"` // "degree" or "metre"
	Dx   float64 `json:"dx"`   // Step size in CRS units (degrees for EPSG:4326, meters for EPSG:6933)
	Dy   float64 `json:"dy"`   // Step size in CRS units (degrees for EPSG:4326, meters for EPSG:6933)
}

// ParseResolution matches resolution strings from dataset catalogs to predefined GridResolutions.
func ParseResolution(resStr string) (GridResolution, error) {
	norm := strings.ToLower(strings.TrimSpace(resStr))
	switch {
	case strings.Contains(norm, "0.1"):
		return ResGPM01, nil
	case strings.Contains(norm, "0.625"):
		return ResMERRA2, nil
	case strings.Contains(norm, "0.5"):
		return ResMERRA2Square, nil
	case strings.Contains(norm, "approx"):
		return ResSMAP9kmApproxGeog, nil
	case strings.Contains(norm, "6933") || strings.Contains(norm, "ease-grid 2.0") || strings.Contains(norm, "ease2"):
		return ResSMAP9kmEASE2, nil
	case strings.Contains(norm, "9 km") || strings.Contains(norm, "9km") || strings.Contains(norm, "ease"):
		return ResSMAP9kmEASE2, nil
	case strings.Contains(norm, "0.05"):
		return ResMODIS005, nil
	default:
		return GridResolution{}, fmt.Errorf("unrecognized grid resolution: %q", resStr)
	}
}

// GridSpec defines the dimensional and spatial properties of a regular 2D raster grid.
type GridSpec struct {
	CRS      string               `json:"crs,omitempty"`  // "EPSG:4326" (default) or "EPSG:6933"
	Unit     string               `json:"unit,omitempty"` // "degree" or "metre"
	BBox     models.BoundingBox   `json:"bbox"`           // Geographic bounding box in lon/lat degrees
	ProjBBox ProjectedBoundingBox `json:"proj_bbox"`      // Planar bounding box in meters (when CRS is EPSG:6933)
	ResX     float64              `json:"res_x"`          // Step size along X in CRS units
	ResY     float64              `json:"res_y"`          // Step size along Y in CRS units
	Cols     int                  `json:"cols"`
	Rows     int                  `json:"rows"`
}

// IsEqualArea reports whether the grid uses an equal-area CRS where each cell has identical surface area.
func (s GridSpec) IsEqualArea() bool {
	return s.CRS == CRS_EPSG6933
}

// NewGridSpec calculates grid dimensions based on a bounding box and resolution.
// Grid coordinates are North-to-South (row 0 at MaxLat / MaxY, row Rows-1 at MinLat / MinY).
// Grid boundaries are snapped outward to global resolution steps ensuring consistent grid alignment.
func NewGridSpec(bbox models.BoundingBox, res GridResolution) (GridSpec, error) {
	if err := ValidateBoundingBox(bbox); err != nil {
		return GridSpec{}, fmt.Errorf("invalid bounding box: %w", err)
	}
	if res.Dx <= 0 || res.Dy <= 0 {
		return GridSpec{}, fmt.Errorf("grid resolutions must be positive, got dx=%f, dy=%f", res.Dx, res.Dy)
	}

	crs := res.CRS
	if crs == "" {
		crs = CRS_EPSG4326
	}

	if crs == CRS_EPSG6933 {
		xMin, yMin, err := ForwardEPSG6933(Point{Lon: bbox.MinLon, Lat: bbox.MinLat})
		if err != nil {
			return GridSpec{}, fmt.Errorf("failed to project bbox lower-left: %w", err)
		}
		xMax, yMax, err := ForwardEPSG6933(Point{Lon: bbox.MaxLon, Lat: bbox.MaxLat})
		if err != nil {
			return GridSpec{}, fmt.Errorf("failed to project bbox upper-right: %w", err)
		}

		snappedMinX := math.Floor(xMin/res.Dx) * res.Dx
		snappedMaxX := math.Ceil(xMax/res.Dx) * res.Dx
		snappedMaxY := math.Ceil(yMax/res.Dy) * res.Dy
		snappedMinY := math.Floor(yMin/res.Dy) * res.Dy

		cols := int(math.Round((snappedMaxX - snappedMinX) / res.Dx))
		rows := int(math.Round((snappedMaxY - snappedMinY) / res.Dy))

		if cols < 1 {
			cols = 1
		}
		if rows < 1 {
			rows = 1
		}

		projBBox := ProjectedBoundingBox{
			MinX: snappedMinX,
			MaxX: snappedMinX + float64(cols)*res.Dx,
			MinY: snappedMaxY - float64(rows)*res.Dy,
			MaxY: snappedMaxY,
		}

		ptMin, _ := InverseEPSG6933(projBBox.MinX, projBBox.MinY)
		ptMax, _ := InverseEPSG6933(projBBox.MaxX, projBBox.MaxY)

		return GridSpec{
			CRS:      CRS_EPSG6933,
			Unit:     "metre",
			BBox:     models.BoundingBox{MinLon: ptMin.Lon, MaxLon: ptMax.Lon, MinLat: ptMin.Lat, MaxLat: ptMax.Lat},
			ProjBBox: projBBox,
			ResX:     res.Dx,
			ResY:     res.Dy,
			Cols:     cols,
			Rows:     rows,
		}, nil
	}

	// Default EPSG:4326 Geographic snapping:
	snappedMinLon := math.Floor(bbox.MinLon/res.Dx) * res.Dx
	snappedMaxLon := math.Ceil(bbox.MaxLon/res.Dx) * res.Dx
	snappedMaxLat := math.Ceil(bbox.MaxLat/res.Dy) * res.Dy
	snappedMinLat := math.Floor(bbox.MinLat/res.Dy) * res.Dy

	cols := int(math.Round((snappedMaxLon - snappedMinLon) / res.Dx))
	rows := int(math.Round((snappedMaxLat - snappedMinLat) / res.Dy))

	if cols < 1 {
		cols = 1
	}
	if rows < 1 {
		rows = 1
	}

	adjustedBBox := models.BoundingBox{
		MinLon: snappedMinLon,
		MaxLon: snappedMinLon + float64(cols)*res.Dx,
		MaxLat: snappedMaxLat,
		MinLat: snappedMaxLat - float64(rows)*res.Dy,
	}

	return GridSpec{
		CRS:  CRS_EPSG4326,
		Unit: "degree",
		BBox: adjustedBBox,
		ResX: res.Dx,
		ResY: res.Dy,
		Cols: cols,
		Rows: rows,
	}, nil
}

// CellCenter computes the geographic center coordinate of the cell at (col, row).
func (s GridSpec) CellCenter(col, row int) Point {
	if s.CRS == CRS_EPSG6933 {
		x := s.ProjBBox.MinX + (float64(col)+0.5)*s.ResX
		y := s.ProjBBox.MaxY - (float64(row)+0.5)*s.ResY
		pt, err := InverseEPSG6933(x, y)
		if err == nil {
			return pt
		}
	}
	lon := s.BBox.MinLon + (float64(col)+0.5)*s.ResX
	lat := s.BBox.MaxLat - (float64(row)+0.5)*s.ResY
	return Point{Lon: lon, Lat: lat}
}

// CoordToCell converts a geographic coordinate to (col, row) indices.
// Returns ok=false if the point falls outside the grid bounds.
func (s GridSpec) CoordToCell(p Point) (col, row int, ok bool) {
	if s.CRS == CRS_EPSG6933 {
		x, y, err := ForwardEPSG6933(p)
		if err != nil {
			return -1, -1, false
		}
		if x < s.ProjBBox.MinX || x > s.ProjBBox.MaxX || y < s.ProjBBox.MinY || y > s.ProjBBox.MaxY {
			return -1, -1, false
		}
		c := int(math.Floor((x - s.ProjBBox.MinX) / s.ResX))
		r := int(math.Floor((s.ProjBBox.MaxY - y) / s.ResY))
		if c >= s.Cols {
			c = s.Cols - 1
		}
		if r >= s.Rows {
			r = s.Rows - 1
		}
		if c < 0 {
			c = 0
		}
		if r < 0 {
			r = 0
		}
		return c, r, true
	}

	if !BoundingBoxContainsPoint(s.BBox, p) {
		return -1, -1, false
	}

	c := int(math.Floor((p.Lon - s.BBox.MinLon) / s.ResX))
	r := int(math.Floor((s.BBox.MaxLat - p.Lat) / s.ResY))

	// Handle upper boundary edge inclusively
	if c >= s.Cols {
		c = s.Cols - 1
	}
	if r >= s.Rows {
		r = s.Rows - 1
	}
	if c < 0 {
		c = 0
	}
	if r < 0 {
		r = 0
	}

	return c, r, true
}

// SpatialGrid represents a 2D raster dataset stored as a contiguous 1D slice.
type SpatialGrid struct {
	Spec        GridSpec  `json:"spec"`
	Data        []float64 `json:"data"` // Contiguous row-major storage (Rows * Cols)
	NoDataValue float64   `json:"no_data_value"`
}

// NewSpatialGrid allocates a new SpatialGrid initialized with defaultValue.
func NewSpatialGrid(spec GridSpec, defaultValue float64) *SpatialGrid {
	totalCells := spec.Rows * spec.Cols
	data := make([]float64, totalCells)
	for i := range data {
		data[i] = defaultValue
	}
	return &SpatialGrid{
		Spec:        spec,
		Data:        data,
		NoDataValue: defaultValue,
	}
}

// Get returns the value at (col, row).
func (g *SpatialGrid) Get(col, row int) float64 {
	if col < 0 || col >= g.Spec.Cols || row < 0 || row >= g.Spec.Rows {
		return g.NoDataValue
	}
	return g.Data[row*g.Spec.Cols+col]
}

// Set updates the value at (col, row).
func (g *SpatialGrid) Set(col, row int, val float64) {
	if col >= 0 && col < g.Spec.Cols && row >= 0 && row < g.Spec.Rows {
		g.Data[row*g.Spec.Cols+col] = val
	}
}

// GetByCoord retrieves the grid value at the geographic coordinate.
func (g *SpatialGrid) GetByCoord(p Point) (float64, bool) {
	c, r, ok := g.Spec.CoordToCell(p)
	if !ok {
		return g.NoDataValue, false
	}
	return g.Get(c, r), true
}

// IsValid checks whether a cell value contains valid physical data (not NaN, Inf, or NoDataValue).
func (g *SpatialGrid) IsValid(val float64) bool {
	if math.IsNaN(val) || math.IsInf(val, 0) {
		return false
	}
	if !math.IsNaN(g.NoDataValue) && val == g.NoDataValue {
		return false
	}
	return true
}

// ValidCount returns the total number of cells with valid data.
func (g *SpatialGrid) ValidCount() int {
	count := 0
	for _, v := range g.Data {
		if g.IsValid(v) {
			count++
		}
	}
	return count
}

// Fill sets all cells in the grid to the specified value.
func (g *SpatialGrid) Fill(val float64) {
	for i := range g.Data {
		g.Data[i] = val
	}
}

// ClipByBoundingBox extracts a subgrid covering the intersection with targetBBox.
func (g *SpatialGrid) ClipByBoundingBox(targetBBox models.BoundingBox) (*SpatialGrid, error) {
	if g.Spec.CRS == CRS_EPSG6933 {
		xMin, yMin, err := ForwardEPSG6933(Point{Lon: targetBBox.MinLon, Lat: targetBBox.MinLat})
		if err != nil {
			return nil, fmt.Errorf("failed to project target bounding box: %w", err)
		}
		xMax, yMax, err := ForwardEPSG6933(Point{Lon: targetBBox.MaxLon, Lat: targetBBox.MaxLat})
		if err != nil {
			return nil, fmt.Errorf("failed to project target bounding box: %w", err)
		}

		interMinX := math.Max(g.Spec.ProjBBox.MinX, xMin)
		interMaxX := math.Min(g.Spec.ProjBBox.MaxX, xMax)
		interMinY := math.Max(g.Spec.ProjBBox.MinY, yMin)
		interMaxY := math.Min(g.Spec.ProjBBox.MaxY, yMax)

		if interMinX >= interMaxX || interMinY >= interMaxY {
			return nil, errors.New("target bounding box does not intersect grid in projected CRS")
		}

		cMin := int(math.Floor((interMinX - g.Spec.ProjBBox.MinX) / g.Spec.ResX))
		cMax := int(math.Ceil((interMaxX - g.Spec.ProjBBox.MinX) / g.Spec.ResX))
		rMin := int(math.Floor((g.Spec.ProjBBox.MaxY - interMaxY) / g.Spec.ResY))
		rMax := int(math.Ceil((g.Spec.ProjBBox.MaxY - interMinY) / g.Spec.ResY))

		if cMin < 0 {
			cMin = 0
		}
		if cMax > g.Spec.Cols {
			cMax = g.Spec.Cols
		}
		if rMin < 0 {
			rMin = 0
		}
		if rMax > g.Spec.Rows {
			rMax = g.Spec.Rows
		}

		subCols := cMax - cMin
		subRows := rMax - rMin

		if subCols <= 0 || subRows <= 0 {
			return nil, errors.New("clipped subgrid has zero cells")
		}

		subProjBBox := ProjectedBoundingBox{
			MinX: g.Spec.ProjBBox.MinX + float64(cMin)*g.Spec.ResX,
			MaxX: g.Spec.ProjBBox.MinX + float64(cMax)*g.Spec.ResX,
			MinY: g.Spec.ProjBBox.MaxY - float64(rMax)*g.Spec.ResY,
			MaxY: g.Spec.ProjBBox.MaxY - float64(rMin)*g.Spec.ResY,
		}

		ptMin, _ := InverseEPSG6933(subProjBBox.MinX, subProjBBox.MinY)
		ptMax, _ := InverseEPSG6933(subProjBBox.MaxX, subProjBBox.MaxY)

		subSpec := GridSpec{
			CRS:      CRS_EPSG6933,
			Unit:     "metre",
			BBox:     models.BoundingBox{MinLon: ptMin.Lon, MaxLon: ptMax.Lon, MinLat: ptMin.Lat, MaxLat: ptMax.Lat},
			ProjBBox: subProjBBox,
			ResX:     g.Spec.ResX,
			ResY:     g.Spec.ResY,
			Cols:     subCols,
			Rows:     subRows,
		}

		subGrid := &SpatialGrid{
			Spec:        subSpec,
			Data:        make([]float64, subRows*subCols),
			NoDataValue: g.NoDataValue,
		}

		for r := 0; r < subRows; r++ {
			srcRow := rMin + r
			srcStart := srcRow*g.Spec.Cols + cMin
			srcEnd := srcStart + subCols
			dstStart := r * subCols
			copy(subGrid.Data[dstStart:dstStart+subCols], g.Data[srcStart:srcEnd])
		}

		return subGrid, nil
	}

	interBBox, ok := BoundingBoxIntersection(g.Spec.BBox, targetBBox)
	if !ok {
		return nil, errors.New("target bounding box does not intersect grid")
	}

	// Calculate column and row ranges in the source grid
	cMin := int(math.Floor((interBBox.MinLon - g.Spec.BBox.MinLon) / g.Spec.ResX))
	cMax := int(math.Ceil((interBBox.MaxLon - g.Spec.BBox.MinLon) / g.Spec.ResX))
	rMin := int(math.Floor((g.Spec.BBox.MaxLat - interBBox.MaxLat) / g.Spec.ResY))
	rMax := int(math.Ceil((g.Spec.BBox.MaxLat - interBBox.MinLat) / g.Spec.ResY))

	if cMin < 0 {
		cMin = 0
	}
	if cMax > g.Spec.Cols {
		cMax = g.Spec.Cols
	}
	if rMin < 0 {
		rMin = 0
	}
	if rMax > g.Spec.Rows {
		rMax = g.Spec.Rows
	}

	subCols := cMax - cMin
	subRows := rMax - rMin

	if subCols <= 0 || subRows <= 0 {
		return nil, errors.New("clipped subgrid has zero cells")
	}

	subBBox := models.BoundingBox{
		MinLon: g.Spec.BBox.MinLon + float64(cMin)*g.Spec.ResX,
		MaxLon: g.Spec.BBox.MinLon + float64(cMax)*g.Spec.ResX,
		MaxLat: g.Spec.BBox.MaxLat - float64(rMin)*g.Spec.ResY,
		MinLat: g.Spec.BBox.MaxLat - float64(rMax)*g.Spec.ResY,
	}

	subSpec := GridSpec{
		CRS:  g.Spec.CRS,
		Unit: g.Spec.Unit,
		BBox: subBBox,
		ResX: g.Spec.ResX,
		ResY: g.Spec.ResY,
		Cols: subCols,
		Rows: subRows,
	}

	subGrid := &SpatialGrid{
		Spec:        subSpec,
		Data:        make([]float64, subRows*subCols),
		NoDataValue: g.NoDataValue,
	}

	// Fast contiguous slice copying row by row
	for r := 0; r < subRows; r++ {
		srcRow := rMin + r
		srcStart := srcRow*g.Spec.Cols + cMin
		srcEnd := srcStart + subCols
		dstStart := r * subCols
		copy(subGrid.Data[dstStart:dstStart+subCols], g.Data[srcStart:srcEnd])
	}

	return subGrid, nil
}

// SpatialMask represents a precomputed boolean bitmask of valid cells for a given GridSpec.
type SpatialMask struct {
	Spec         GridSpec `json:"spec"`
	Mask         []bool   `json:"mask"` // size Rows * Cols
	ValidIndices []int    `json:"valid_indices"`
}

// ComputeSpatialMask precomputes cell inclusion against a polygon.
// This allows reusing the mask across all multi-temporal time series without re-running PIP.
func ComputeSpatialMask(spec GridSpec, poly *Polygon) *SpatialMask {
	total := spec.Rows * spec.Cols
	mask := make([]bool, total)
	validIndices := make([]int, 0, total/2)

	for r := 0; r < spec.Rows; r++ {
		rowOffset := r * spec.Cols
		for c := 0; c < spec.Cols; c++ {
			pt := spec.CellCenter(c, r)
			if poly.Contains(pt) {
				idx := rowOffset + c
				mask[idx] = true
				validIndices = append(validIndices, idx)
			}
		}
	}

	return &SpatialMask{
		Spec:         spec,
		Mask:         mask,
		ValidIndices: validIndices,
	}
}

// ComputeMultiPolygonMask precomputes cell inclusion against a multi-polygon.
func ComputeMultiPolygonMask(spec GridSpec, mp *MultiPolygon) *SpatialMask {
	total := spec.Rows * spec.Cols
	mask := make([]bool, total)
	validIndices := make([]int, 0, total/2)

	for r := 0; r < spec.Rows; r++ {
		rowOffset := r * spec.Cols
		for c := 0; c < spec.Cols; c++ {
			pt := spec.CellCenter(c, r)
			if mp.Contains(pt) {
				idx := rowOffset + c
				mask[idx] = true
				validIndices = append(validIndices, idx)
			}
		}
	}

	return &SpatialMask{
		Spec:         spec,
		Mask:         mask,
		ValidIndices: validIndices,
	}
}

// ClipByPolygon crops the grid to the polygon's bounding box and masks out external cells.
func (g *SpatialGrid) ClipByPolygon(poly *Polygon) (*SpatialGrid, error) {
	subGrid, err := g.ClipByBoundingBox(poly.BoundingBox())
	if err != nil {
		return nil, fmt.Errorf("failed to clip grid by polygon envelope: %w", err)
	}

	mask := ComputeSpatialMask(subGrid.Spec, poly)
	for i, inPoly := range mask.Mask {
		if !inPoly {
			subGrid.Data[i] = subGrid.NoDataValue
		}
	}

	return subGrid, nil
}
