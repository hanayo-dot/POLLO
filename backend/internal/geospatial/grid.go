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
	ResGPM01 = GridResolution{Name: "0.1° (~10 km)", Dx: 0.1, Dy: 0.1}

	// ResMERRA2 represents 0.5° x 0.625° resolution for MERRA-2 GMAO reanalysis.
	ResMERRA2 = GridResolution{Name: "0.5° × 0.625°", Dx: 0.625, Dy: 0.5}

	// ResMERRA2Square represents regular 0.5° resolution.
	ResMERRA2Square = GridResolution{Name: "0.5°", Dx: 0.5, Dy: 0.5}

	// ResSMAP9km represents 9 km EASE-Grid soil moisture (~0.08085° equivalent at equator).
	// 9 km / 111.32 km/degree = 0.08084800575°
	ResSMAP9km = GridResolution{Name: "9 km EASE-Grid", Dx: 9.0 / 111.32, Dy: 9.0 / 111.32}

	// ResMODIS005 represents 0.05° (~5.6 km) resolution for MODIS Land Surface Temperature (MOD11C3).
	ResMODIS005 = GridResolution{Name: "0.05° (~5.6 km)", Dx: 0.05, Dy: 0.05}
)

// GridResolution encapsulates the spatial resolution in decimal degrees.
type GridResolution struct {
	Name string  `json:"name"`
	Dx   float64 `json:"dx"` // Longitude step in degrees
	Dy   float64 `json:"dy"` // Latitude step in degrees
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
	case strings.Contains(norm, "9 km") || strings.Contains(norm, "9km"):
		return ResSMAP9km, nil
	case strings.Contains(norm, "0.05"):
		return ResMODIS005, nil
	default:
		return GridResolution{}, fmt.Errorf("unrecognized grid resolution: %q", resStr)
	}
}

// GridSpec defines the dimensional and spatial properties of a regular 2D raster grid.
type GridSpec struct {
	BBox models.BoundingBox `json:"bbox"`
	ResX float64            `json:"res_x"`
	ResY float64            `json:"res_y"`
	Cols int                `json:"cols"`
	Rows int                `json:"rows"`
}

// NewGridSpec calculates grid dimensions based on a bounding box and resolution.
// Grid coordinates are North-to-South (row 0 at MaxLat, row Rows-1 at MinLat).
func NewGridSpec(bbox models.BoundingBox, res GridResolution) (GridSpec, error) {
	if err := ValidateBoundingBox(bbox); err != nil {
		return GridSpec{}, fmt.Errorf("invalid bounding box: %w", err)
	}
	if res.Dx <= 0 || res.Dy <= 0 {
		return GridSpec{}, fmt.Errorf("grid resolutions must be positive, got dx=%f, dy=%f", res.Dx, res.Dy)
	}

	dLon := bbox.MaxLon - bbox.MinLon
	dLat := bbox.MaxLat - bbox.MinLat

	cols := int(math.Round(dLon / res.Dx))
	rows := int(math.Round(dLat / res.Dy))

	if cols < 1 {
		cols = 1
	}
	if rows < 1 {
		rows = 1
	}

	// Snap MaxLon and MinLat to exact grid steps for numerical stability
	adjustedBBox := models.BoundingBox{
		MinLon: bbox.MinLon,
		MaxLon: bbox.MinLon + float64(cols)*res.Dx,
		MaxLat: bbox.MaxLat,
		MinLat: bbox.MaxLat - float64(rows)*res.Dy,
	}

	return GridSpec{
		BBox: adjustedBBox,
		ResX: res.Dx,
		ResY: res.Dy,
		Cols: cols,
		Rows: rows,
	}, nil
}

// CellCenter computes the geographic center coordinate of the cell at (col, row).
func (s GridSpec) CellCenter(col, row int) Point {
	lon := s.BBox.MinLon + (float64(col)+0.5)*s.ResX
	lat := s.BBox.MaxLat - (float64(row)+0.5)*s.ResY
	return Point{Lon: lon, Lat: lat}
}

// CoordToCell converts a geographic coordinate to (col, row) indices.
// Returns ok=false if the point falls outside the grid bounds.
func (s GridSpec) CoordToCell(p Point) (col, row int, ok bool) {
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
