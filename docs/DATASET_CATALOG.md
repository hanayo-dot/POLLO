# NASA Dataset Catalog & Ingestion Specifications

POLLO unifies observations across four planetary spheres using authentic NASA Earth Science Data.

---

## 1. Atmosphere: MERRA-2
- **Mission/Product:** Modern-Era Retrospective analysis for Research and Applications, Version 2 (MERRA-2)
- **Producing Organization:** NASA Global Modeling and Assimilation Office (GMAO)
- **Spatial Resolution:** $0.5^\circ \times 0.625^\circ$
- **Temporal Resolution:** Hourly to Monthly averages
- **Variables Ingested:**
  - `T2M`: 2-meter air temperature ($^\circ\text{C}$ or $\text{K}$)
  - `SLP`: Sea-level atmospheric pressure ($\text{hPa}$)
  - `QV2M`: 2-meter specific humidity ($\text{kg/kg}$)
  - `AOD`: Aerosol Optical Depth at 550nm (dimensionless)
- **DOI/URL:** [https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/](https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/)

---

## 2. Precipitation: GPM IMERG
- **Mission/Product:** Integrated Multi-satellitE Retrievals for GPM (IMERG Final Run V07)
- **Producing Organization:** NASA Goddard Space Flight Center / JAXA
- **Spatial Resolution:** $0.1^\circ \times 0.1^\circ$ (~10 km)
- **Temporal Resolution:** 30-minute / Daily / Monthly accumulations
- **Variables Ingested:**
  - `precipitationCal`: Calibrated precipitation rate ($\text{mm/month}$ or $\text{mm/day}$)
  - `precipitationUncal`: Uncalibrated passive microwave estimates
- **Coverage:** Global $60^\circ\text{N} - 60^\circ\text{S}$, 2000–present
- **DOI/URL:** [https://gpm.nasa.gov/data/imerg](https://gpm.nasa.gov/data/imerg)

---

## 3. Land Surface: MODIS LST & SMAP
- **Mission/Product 1:** MOD11C3 / MYD11C3 (MODIS Terra/Aqua Land Surface Temperature Monthly CMG)
  - **Spatial Resolution:** $0.05^\circ \times 0.05^\circ$ (~5.6 km)
  - **Temporal Resolution:** Monthly
  - **Variables:** `LST_Day_CMG`, `LST_Night_CMG`, Quality Control flags
- **Mission/Product 2:** SMAP L4 Global Daily 9 km EASE-Grid Surface and Root-Zone Soil Moisture
  - **Spatial Resolution:** 9 km
  - **Temporal Resolution:** Daily / Monthly aggregate
  - **Variables:** `surface_soil_moisture` ($\text{m}^3/\text{m}^3$), `rootzone_soil_moisture`
- **DOI/URL:** [https://smap.jpl.nasa.gov/](https://smap.jpl.nasa.gov/)

---

## 4. Benchmark Demonstration Region: Lake Victoria Basin
- **Geographical Extent:** $2.5^\circ\text{N} - 4.5^\circ\text{S}$, $29.0^\circ\text{E} - 36.0^\circ\text{E}$
- **Jurisdictions:** Kenya, Uganda, Tanzania, Rwanda, Burundi
- **Ecological Context:** World's second-largest freshwater lake by surface area; acute nexus of climate variability, changing precipitation regimes, regional agricultural dependence, and extreme convective storm generation.
