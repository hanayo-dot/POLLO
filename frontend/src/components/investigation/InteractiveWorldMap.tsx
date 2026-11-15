"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  Marker as MapLibreMarker,
  Popup,
  GeoJSONSource,
} from "maplibre-gl";
import {
  Map as MapIcon,
  ChevronDown,
  Info,
  Plus,
  Minus,
  Crosshair,
  Layers,
  Globe2,
  Maximize2,
  Sparkles,
} from "lucide-react";

interface InteractiveWorldMapProps {
  variableId: "soil_moisture" | "rainfall" | "temperature" | "ndvi";
  variableName: string;
  variableUnit: string;
  datasetName: string;
  selectedRegionName: string;
  centerCoordinates: [number, number]; // [lon, lat]
  targetZoom?: number;
  onDatasetClick?: () => void;
  onInfoClick?: () => void;
  onLocationClick?: (coords: { lat: number; lon: number; label: string }) => void;
}

export const InteractiveWorldMap: React.FC<InteractiveWorldMapProps> = ({
  variableId,
  variableName,
  variableUnit,
  datasetName,
  selectedRegionName,
  centerCoordinates,
  targetZoom = 2,
  onDatasetClick,
  onInfoClick,
  onLocationClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);

  const [mapStyle, setMapStyle] = useState<"satellite" | "dark" | "terrain">("satellite");
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lon: number; lat: number } | null>(null);
  const [activePointInfo, setActivePointInfo] = useState<{
    lon: number;
    lat: number;
    name: string;
    value: string;
  } | null>(null);

  // Basemap style definitions
  const mapStyles = {
    satellite: {
      version: 8 as const,
      sources: {
        "esri-satellite": {
          type: "raster" as const,
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "&copy; Esri, Maxar, Earthstar Geographics",
        },
        "esri-labels": {
          type: "raster" as const,
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "esri-satellite-layer",
          type: "raster" as const,
          source: "esri-satellite",
          minzoom: 0,
          maxzoom: 19,
        },
        {
          id: "esri-labels-layer",
          type: "raster" as const,
          source: "esri-labels",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
    dark: {
      version: 8 as const,
      sources: {
        "carto-dark": {
          type: "raster" as const,
          tiles: [
            "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          ],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap contributors, &copy; CARTO",
        },
      },
      layers: [
        {
          id: "carto-dark-layer",
          type: "raster" as const,
          source: "carto-dark",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
    terrain: {
      version: 8 as const,
      sources: {
        "opentopo": {
          type: "raster" as const,
          tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap, SRTM | OpenTopoMap",
        },
      },
      layers: [
        {
          id: "opentopo-layer",
          type: "raster" as const,
          source: "opentopo",
          minzoom: 0,
          maxzoom: 17,
        },
      ],
    },
  };

  // Variable Legend Configurations
  const legendConfig = {
    soil_moisture: {
      title: "Soil Moisture",
      unit: "(m³/m³)",
      top: "0.6",
      mid: "0.4",
      bottom: "0.2",
      gradient: "from-[#1e40af] via-[#06b6d4] via-[#eab308] to-[#ea580c]",
    },
    rainfall: {
      title: "Rainfall",
      unit: "(mm/day)",
      top: "4.5",
      mid: "2.5",
      bottom: "1.0",
      gradient: "from-[#4338ca] via-[#38bdf8] via-[#a3e635] to-[#f59e0b]",
    },
    temperature: {
      title: "Temperature",
      unit: "(°C)",
      top: "32",
      mid: "24",
      bottom: "16",
      gradient: "from-[#b91c1c] via-[#ea580c] via-[#eab308] to-[#0284c7]",
    },
    ndvi: {
      title: "NDVI Index",
      unit: "(0–1)",
      top: "0.7",
      mid: "0.4",
      bottom: "0.1",
      gradient: "from-[#047857] via-[#10b981] via-[#ca8a04] to-[#78350f]",
    },
  }[variableId];

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: mapStyles[mapStyle],
      center: centerCoordinates,
      zoom: targetZoom,
      attributionControl: false,
    });

    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    // Track Cursor Coordinates
    map.on("mousemove", (e) => {
      setCursorCoords({
        lon: Number(e.lngLat.lng.toFixed(2)),
        lat: Number(e.lngLat.lat.toFixed(2)),
      });
    });

    // Handle Click anywhere in the world
    map.on("click", (e) => {
      const lat = Number(e.lngLat.lat.toFixed(2));
      const lon = Number(e.lngLat.lng.toFixed(2));

      // Calculate estimated value for the active variable at this coordinate
      let simulatedVal = "0.34";
      if (variableId === "soil_moisture") {
        const val = Math.max(0.12, Math.min(0.58, 0.35 + Math.cos((lat * Math.PI) / 60) * 0.15));
        simulatedVal = `${val.toFixed(2)} m³/m³`;
      } else if (variableId === "rainfall") {
        const val = Math.max(0.5, Math.min(6.5, 2.5 + Math.cos((lat * Math.PI) / 45) * 2.2));
        simulatedVal = `${val.toFixed(1)} mm/day`;
      } else if (variableId === "temperature") {
        const val = Math.max(-10, Math.min(36, 28 - Math.abs(lat) * 0.55));
        simulatedVal = `${val.toFixed(1)} °C`;
      } else {
        const val = Math.max(0.1, Math.min(0.85, 0.45 + Math.cos((lat * Math.PI) / 50) * 0.25));
        simulatedVal = `${val.toFixed(2)}`;
      }

      // Identify approximate region
      let locLabel = `Coordinates [${lat}°N, ${lon}°E]`;
      if (lat >= -5 && lat <= 5 && lon >= 33 && lon <= 42) locLabel = "Kenya & East Africa";
      else if (lat >= -15 && lat <= 5 && lon >= -75 && lon <= -45) locLabel = "Amazon Rainforest Basin";
      else if (lat >= 10 && lat <= 18 && lon >= -18 && lon <= 30) locLabel = "Sahel Zone";
      else if (lat >= 34 && lat <= 46 && lon >= -10 && lon <= 36) locLabel = "Mediterranean Basin";
      else if (lat >= 30 && lat <= 48 && lon >= -125 && lon <= -70) locLabel = "North America";
      else if (lat >= -40 && lat <= -12 && lon >= 115 && lon <= 155) locLabel = "Australia";
      else if (lat >= 20 && lat <= 40 && lon >= 100 && lon <= 125) locLabel = "East Asia";
      else if (lat >= 8 && lat <= 35 && lon >= 68 && lon <= 92) locLabel = "South Asia";

      setActivePointInfo({
        lat,
        lon,
        name: locLabel,
        value: simulatedVal,
      });

      // Update Marker
      if (markerRef.current) {
        markerRef.current.setLngLat([lon, lat]);
      } else {
        // Create custom glowing reticle element
        const el = document.createElement("div");
        el.className = "reticle-marker";
        el.innerHTML = `
          <div style="position: relative; width: 32px; height: 32px; display: flex; items-center; justify-content: center;">
            <div style="position: absolute; inset: 0; border: 2px solid #38bdf8; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>
            <div style="position: absolute; width: 14px; height: 14px; background: #0284c7; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px #38bdf8;"></div>
          </div>
        `;
        const marker = new MapLibreMarker({ element: el })
          .setLngLat([lon, lat])
          .addTo(map);
        markerRef.current = marker;
      }

      if (onLocationClick) {
        onLocationClick({ lat, lon, label: locLabel });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Handle map style changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(mapStyles[mapStyle]);
  }, [mapStyle]);

  // Handle center and zoom updates when a region or preset is selected
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: centerCoordinates,
      zoom: targetZoom,
      duration: 1800,
      essential: true,
    });

    // Update marker location to center of selected region
    if (markerRef.current) {
      markerRef.current.setLngLat(centerCoordinates);
    } else {
      const el = document.createElement("div");
      el.className = "reticle-marker";
      el.innerHTML = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; items-center; justify-content: center;">
          <div style="position: absolute; inset: 0; border: 2px solid #38bdf8; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>
          <div style="position: absolute; width: 14px; height: 14px; background: #0284c7; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px #38bdf8;"></div>
        </div>
      `;
      const marker = new MapLibreMarker({ element: el })
        .setLngLat(centerCoordinates)
        .addTo(mapRef.current);
      markerRef.current = marker;
    }
  }, [centerCoordinates, targetZoom]);

  const handleZoomIn = () => {
    if (!mapRef.current) return;
    mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    mapRef.current.zoomOut();
  };

  const handleResetWorld = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [15, 20],
      zoom: 1.8,
      duration: 1800,
    });
    if (onLocationClick) {
      onLocationClick({ lat: 20, lon: 15, label: "Global Terrestrial Overview" });
    }
  };

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col shadow-xl">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-slate-800/60 mb-3">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            {selectedRegionName} {variableName} Map
          </h2>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/80 text-blue-300 border border-blue-500/30">
            Interactive Global View
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Style Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
              className="bg-[#131b2e] hover:bg-[#1a253f] border border-slate-700/70 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Basemap Style"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="capitalize">{mapStyle}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isStyleDropdownOpen && (
              <div className="absolute right-0 top-9 w-36 bg-[#0e1628] border border-slate-700 rounded-xl p-1 shadow-2xl z-40 flex flex-col gap-1">
                {[
                  { id: "satellite", label: "Satellite Hybrid" },
                  { id: "dark", label: "Carto Dark" },
                  { id: "terrain", label: "Terrain Relief" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setMapStyle(s.id as "satellite" | "dark" | "terrain");
                      setIsStyleDropdownOpen(false);
                    }}
                    className={`text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                      mapStyle === s.id
                        ? "bg-blue-600 text-white font-medium"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dataset Selector */}
          <button
            onClick={onDatasetClick}
            className="bg-[#131b2e] hover:bg-[#1a253f] border border-slate-700/70 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>{datasetName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={onInfoClick}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Dataset Information"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real Map Viewport Container */}
      <div className="relative w-full h-[380px] sm:h-[420px] rounded-xl overflow-hidden bg-[#070b14] select-none border border-slate-800/80">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Live Active Inspection HUD Banner (when a user clicks anywhere on Earth) */}
        {activePointInfo && (
          <div className="absolute top-4 right-4 bg-[#0a0f1d]/90 backdrop-blur-md border border-blue-500/50 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs text-white max-w-xs animate-fade-in z-30">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-sky-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {activePointInfo.name}
              </span>
              <button
                onClick={() => setActivePointInfo(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] text-slate-300">
              Coordinates: <span className="font-mono text-white">{activePointInfo.lat}°N, {activePointInfo.lon}°E</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Instantaneous {variableName}:{" "}
              <span className="font-mono font-bold text-emerald-400">{activePointInfo.value}</span>
            </div>
          </div>
        )}

        {/* Inset Left Floating Legend */}
        <div className="absolute top-4 left-4 bg-[#0a0f1d]/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-2xl pointer-events-auto z-20">
          <div className="text-[11px] font-semibold text-slate-200">{legendConfig.title}</div>
          <div className="text-[10px] text-slate-400 mb-2">{legendConfig.unit}</div>

          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-28 rounded-full bg-gradient-to-b ${legendConfig.gradient} shadow-inner border border-white/20`}
            />
            <div className="h-28 flex flex-col justify-between text-[10px] text-slate-300 font-mono">
              <span>{legendConfig.top}</span>
              <span>{legendConfig.mid}</span>
              <span>{legendConfig.bottom}</span>
            </div>
          </div>
        </div>

        {/* Live Cursor Coordinates & Tip (Bottom-Left) */}
        <div className="absolute bottom-3 left-4 bg-[#070d1e]/85 backdrop-blur-sm border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 font-mono pointer-events-none z-20 flex items-center gap-2">
          {cursorCoords ? (
            <span>
              Lat: {cursorCoords.lat > 0 ? `${cursorCoords.lat}°N` : `${Math.abs(cursorCoords.lat)}°S`} | Lon:{" "}
              {cursorCoords.lon > 0 ? `${cursorCoords.lon}°E` : `${Math.abs(cursorCoords.lon)}°W`}
            </span>
          ) : (
            <span>Explore any place on Earth</span>
          )}
          <span className="text-slate-600">|</span>
          <span className="text-sky-400">Click anywhere to sample data</span>
        </div>

        {/* Inset Bottom-Right Controls (Zoom, Reset to World) */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 pointer-events-auto z-20">
          <div className="bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/60 rounded-lg flex flex-col overflow-hidden shadow-lg">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom In (or use mouse wheel)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="h-px bg-slate-700/60" />
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom Out (or use mouse wheel)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handleResetWorld}
            className="p-1.5 bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/60 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
            title="Reset to Global World View"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
