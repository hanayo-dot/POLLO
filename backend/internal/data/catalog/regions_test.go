package catalog

import (
	"strings"
	"testing"

	"github.com/pollo/backend/internal/geospatial"
)

func TestCatalogRegionProvenance(t *testing.T) {
	expectedRegions := []string{
		"lake_victoria_basin",
		"horn_of_africa",
		"congo_basin",
		"sahel_belt",
	}

	provenances := AvailableRegionProvenances()
	if len(provenances) != len(expectedRegions) {
		t.Fatalf("expected %d region provenances, got %d", len(expectedRegions), len(provenances))
	}

	for _, id := range expectedRegions {
		prov, ok := GetRegionProvenance(id)
		if !ok {
			t.Errorf("region %s missing provenance metadata", id)
			continue
		}
		if prov.RegionID != id {
			t.Errorf("expected RegionID %s, got %s", id, prov.RegionID)
		}
		if prov.Authority == "" {
			t.Errorf("region %s has empty Authority designation", id)
		}
		// Must explicitly state non-authoritative / demonstration status
		if !strings.Contains(strings.ToLower(prov.Authority), "non-authoritative") {
			t.Errorf("region %s authority should explicitly state non-authoritative status, got %q", id, prov.Authority)
		}
		if prov.Source == "" {
			t.Errorf("region %s has empty Source documentation", id)
		}
		if prov.Description == "" {
			t.Errorf("region %s has empty Description", id)
		}
	}
}

type ControlPointFixture struct {
	Name     string
	Lon      float64
	Lat      float64
	Expected bool // true: must be inside or on boundary; false: must be strictly outside
}

func TestCatalogRegionGeographicalControlPoints(t *testing.T) {
	// Real-world geographical fixtures verifying point-in-polygon accuracy
	fixtures := map[string][]ControlPointFixture{
		"lake_victoria_basin": {
			// Points EXPECTED INSIDE Lake Victoria Basin:
			{"Lake Victoria Open Water Center", 33.0, -1.0, true},
			{"Kisumu Kenya (Winam Gulf)", 34.75, -0.10, true},
			{"Entebbe Uganda (Northern Shore)", 32.46, 0.05, true},
			{"Mwanza Tanzania (Southern Shore)", 32.90, -2.52, true},
			{"Kigali Rwanda (Kagera Basin)", 30.06, -1.95, true},
			{"Bukoba Tanzania (Western Shore)", 31.81, -1.33, true},

			// Points EXPECTED OUTSIDE Lake Victoria Basin:
			{"Nairobi Kenya (East of Mau Divide, Athi Basin)", 36.82, -1.29, false},
			{"Gulu Uganda (North, Nile / Aswa Drainage)", 32.30, 2.77, false},
			{"Kigoma Tanzania (Lake Tanganyika Rift Valley)", 29.63, -4.88, false},
			{"Dodoma Tanzania (Central Semi-Arid Plateau)", 35.75, -6.17, false},
			{"Mombasa Kenya (Indian Ocean Coast)", 39.67, -4.04, false},
			{"Kinshasa DRC (Far West)", 15.31, -4.32, false},
		},
		"horn_of_africa": {
			// Points EXPECTED INSIDE Horn of Africa:
			{"Mogadishu Somalia (Benadir Coast)", 45.34, 2.04, true},
			{"Hargeisa Somaliland (Guban Foothills)", 44.06, 9.56, true},
			{"Garowe Puntland (Nugaal Valley)", 48.48, 8.40, true},
			{"Galkayo Somalia (Mudug Region)", 47.43, 6.77, true},
			{"Kebri Dehar Ethiopia (Ogaden Basin)", 44.28, 6.74, true},
			{"Bosaso Somalia (Gulf of Aden Port)", 49.18, 11.28, true},
			{"Burao Somaliland (Togdheer)", 45.53, 9.52, true},

			// Points EXPECTED OUTSIDE Horn of Africa:
			{"Addis Ababa Ethiopia (Highland Plateau)", 38.75, 9.03, false},
			{"Nairobi Kenya (Southwest)", 36.82, -1.29, false},
			{"Sana'a Yemen (North across Gulf of Aden)", 44.21, 15.35, false},
			{"Mombasa Kenya (South)", 39.67, -4.04, false},
			{"Khartoum Sudan (Northwest)", 32.53, 15.50, false},
		},
		"congo_basin": {
			// Points EXPECTED INSIDE Congo Rainforest Basin:
			{"Kisangani DRC (Upper Congo River)", 25.19, 0.52, true},
			{"Mbandaka DRC (Equator Congo River Confluence)", 18.26, 0.05, true},
			{"Boende DRC (Cuvette Centrale Core)", 20.88, -0.22, true},
			{"Yangambi DRC (Rainforest Biosphere Reserve)", 24.44, 0.77, true},
			{"Lisala DRC (Middle Congo)", 21.51, 2.15, true},

			// Points EXPECTED OUTSIDE Congo Rainforest Basin:
			{"Kinshasa DRC / Brazzaville (Downstream Southwest)", 15.31, -4.32, false},
			{"Lubumbashi DRC (Southern Katanga Plateau)", 27.48, -11.66, false},
			{"Yaounde Cameroon (West)", 11.50, 3.85, false},
			{"Juba South Sudan (Northeast Sudd)", 31.60, 4.85, false},
			{"Luanda Angola (Atlantic Coast)", 13.23, -8.84, false},
		},
		"sahel_belt": {
			// Points EXPECTED INSIDE Sudano-Sahel Transition Belt:
			{"Niamey Niger (Niger River Basin)", 2.11, 13.51, true},
			{"Lake Chad / Bol (Chad Basin Core)", 14.71, 13.46, true},
			{"Gao Mali (Sahelian Niger Bend)", -0.04, 16.27, true},
			{"Agadez Niger (Southern Air Foothills)", 7.99, 16.97, true},
			{"Zinder Niger (South-Central Sahel)", 8.98, 13.80, true},
			{"Maradi Niger (Central Sahel)", 7.10, 13.50, true},

			// Points EXPECTED OUTSIDE Sudano-Sahel Transition Belt:
			{"Lagos Nigeria (Guinean Coastal Forest, South)", 3.39, 6.52, false},
			{"Tamanrasset Algeria (Hyper-arid Sahara, North)", 5.52, 22.79, false},
			{"Dakar Senegal (Far West Coast)", -17.44, 14.69, false},
			{"Khartoum Sudan (East of Extent)", 32.53, 15.50, false},
			{"Accra Ghana (Atlantic Coast)", -0.19, 5.60, false},
		},
	}

	for regID, pts := range fixtures {
		t.Run(regID, func(t *testing.T) {
			poly, ok := GetRegionPolygon(regID)
			if !ok {
				t.Fatalf("region %s missing from polygon catalog", regID)
			}

			for _, pt := range pts {
				got := poly.Contains(geospatial.Point{Lon: pt.Lon, Lat: pt.Lat})
				if got != pt.Expected {
					t.Errorf("[%s] control point %s (%f, %f): got contains=%v, want=%v",
						regID, pt.Name, pt.Lon, pt.Lat, got, pt.Expected)
				}
			}
		})
	}
}
