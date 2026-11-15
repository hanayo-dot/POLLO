"use client";

import React, { useEffect, useRef, useState } from "react";
import { Map, NavigationControl, ScaleControl, GeoJSONSource } from "maplibre-gl";
import { Layers, Maximize2, RotateCcw, Eye, ShieldCheck, MapPin } from "lucide-react";
import { GeographicalTarget, SpatialMapDataset } from "../../types";

interface MapLibreGeographicalMapProps {
  target: GeographicalTarget;
  activeLayer: "distribution" | "anomalies" | "trend" | "significance";
  onLayerChange?: (layer: "distribution" | "anomalies" | "trend" | "significance") => void;
  variableName: string;
  variableUnit: string;
  spatialData?: SpatialMapDataset | null;
  className?: string;
}

export const MapLibreGeographicalMap: React.FC<MapLibreGeographicalMapProps> = ({
  target,
  activeLayer,
  onLayerChange,
  variableName,
  variableUnit,
  spatialData,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite" | "terrain">("satellite");
  const [cursorCoords, setCursorCoords] = useState<{ lon: number; lat: number } | null>(null);

  // Basemap style URLs (ESRI Satellite, CARTO dark, OpenTopoMap)
  const styleUrls = {
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
        "esri-dark": {
          type: "raster" as const,
          tiles: [
            "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "&copy; Esri, HERE, Garmin",
        },
      },
      layers: [
        {
          id: "esri-dark-layer",
          type: "raster" as const,
          source: "esri-dark",
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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      style: styleUrls[mapStyle],
      center: target.centerCoordinates,
      zoom: target.level === "country" ? 5.5 : target.level === "county" ? 7.2 : 4.8,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("mousemove", (e) => {
      setCursorCoords({
        lon: Number(e.lngLat.lng.toFixed(3)),
        lat: Number(e.lngLat.lat.toFixed(3)),
      });
    });

    map.on("load", () => {
      updateMapLayers(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle map style change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(styleUrls[mapStyle]);
    mapRef.current.once("style.load", () => {
      if (mapRef.current) updateMapLayers(mapRef.current);
    });
  }, [mapStyle]);

  // Handle target change (fly to target extent)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    map.fitBounds(
      [
        [target.bbox.min_lon, target.bbox.min_lat],
        [target.bbox.max_lon, target.bbox.max_lat],
      ],
      { padding: 40, duration: 1500 }
    );

    updateMapLayers(map);
  }, [target]);

  // Handle spatial data or layer update
  useEffect(() => {
    if (!mapRef.current) return;
    updateMapLayers(mapRef.current);
  }, [activeLayer, spatialData]);

  const updateMapLayers = (map: Map) => {
    if (!map.isStyleLoaded()) return;

    // 1. Draw Bounding Box GeoJSON Polygon
    const bboxPolygon = {
      type: "Feature" as const,
      properties: { name: target.name },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [target.bbox.min_lon, target.bbox.min_lat],
            [target.bbox.max_lon, target.bbox.min_lat],
            [target.bbox.max_lon, target.bbox.max_lat],
            [target.bbox.min_lon, target.bbox.max_lat],
            [target.bbox.min_lon, target.bbox.min_lat],
          ],
        ],
      },
    };

    if (map.getSource("target-boundary")) {
      (map.getSource("target-boundary") as GeoJSONSource).setData(bboxPolygon);
    } else {
      map.addSource("target-boundary", {
        type: "geojson",
        data: bboxPolygon,
      });

      map.addLayer({
        id: "target-boundary-fill",
        type: "fill",
        source: "target-boundary",
        paint: {
          "fill-color": "#2563eb",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: "target-boundary-line",
        type: "line",
        source: "target-boundary",
        paint: {
          "line-color": "#00e5ff",
          "line-width": 2,
          "line-dasharray": [2, 1],
        },
      });
    }

    // 2. Draw Scientific Spatial Data Grid
    if (spatialData && spatialData.points && spatialData.points.length > 0) {
      const pointFeatures = {
        type: "FeatureCollection" as const,
        features: spatialData.points.map((pt) => ({
          type: "Feature" as const,
          properties: {
            value: pt.value,
            anomaly: pt.anomaly,
            rate: pt.rateOfChange,
            isSig: pt.isSignificant,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [pt.lon, pt.lat],
          },
        })),
      };

      if (map.getSource("spatial-grid")) {
        (map.getSource("spatial-grid") as GeoJSONSource).setData(pointFeatures);
      } else {
        map.addSource("spatial-grid", {
          type: "geojson",
          data: pointFeatures,
        });

        // Layer: Circle Grid
        map.addLayer({
          id: "spatial-grid-circles",
          type: "circle",
          source: "spatial-grid",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 30],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "value"],
              0.1,
              "#92400e",
              0.18,
              "#d97706",
              0.24,
              "#10b981",
              0.3,
              "#06b6d4",
              0.38,
              "#2563eb",
            ],
            "circle-opacity": 0.75,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.4,
          },
        });
      }
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[460px] bg-space-950 rounded-2xl overflow-hidden border border-space-800 ${className}`}>
      {/* MapLibre DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* Top Map Controls: Basemap Style & Spatial Layers */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        {/* Style Selector */}
        <div className="flex bg-space-900/90 backdrop-blur-md border border-space-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setMapStyle("dark")}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              mapStyle === "dark" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Scientific Dark
          </button>
          <button
            onClick={() => setMapStyle("satellite")}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              mapStyle === "satellite" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle("terrain")}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              mapStyle === "terrain" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Terrain
          </button>
        </div>

        {/* Scientific Layer Switcher */}
        {onLayerChange && (
          <div className="flex bg-space-900/90 backdrop-blur-md border border-space-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => onLayerChange("distribution")}
              className={`px-2.5 py-1 rounded transition-all ${
                activeLayer === "distribution" ? "bg-nasa-cyan/20 text-nasa-cyan border border-nasa-cyan/40" : "text-gray-400 hover:text-white"
              }`}
            >
              Distribution
            </button>
            <button
              onClick={() => onLayerChange("anomalies")}
              className={`px-2.5 py-1 rounded transition-all ${
                activeLayer === "anomalies" ? "bg-nasa-cyan/20 text-nasa-cyan border border-nasa-cyan/40" : "text-gray-400 hover:text-white"
              }`}
            >
              Anomalies
            </button>
            <button
              onClick={() => onLayerChange("trend")}
              className={`px-2.5 py-1 rounded transition-all ${
                activeLayer === "trend" ? "bg-nasa-cyan/20 text-nasa-cyan border border-nasa-cyan/40" : "text-gray-400 hover:text-white"
              }`}
            >
              Long-Term Rate (β)
            </button>
            <button
              onClick={() => onLayerChange("significance")}
              className={`px-2.5 py-1 rounded transition-all ${
                activeLayer === "significance" ? "bg-emerald-950 text-emerald-400 border border-emerald-700" : "text-gray-400 hover:text-white"
              }`}
            >
              Significance (p≤0.05)
            </button>
          </div>
        )}
      </div>

      {/* Target Info Pill */}
      <div className="absolute top-4 right-14 z-10 bg-space-900/90 backdrop-blur-md border border-space-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 font-mono hidden sm:flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-nasa-cyan" />
        <span className="font-semibold text-white">{target.name}</span>
        <span className="text-gray-500">[{target.bbox.min_lon}°, {target.bbox.min_lat}°]</span>
      </div>

      {/* Dynamic Scientific Legend */}
      <div className="absolute bottom-6 right-4 z-10 bg-space-950/90 backdrop-blur-md border border-space-800 rounded-xl p-3 shadow-xl max-w-xs text-xs font-mono">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-white uppercase">{variableName}</span>
          <span className="text-[10px] text-nasa-cyan">{variableUnit}</span>
        </div>

        {/* Color Gradient Bar */}
        <div className="w-48 h-3 rounded-full bg-gradient-to-r from-amber-700 via-emerald-500 to-blue-600 border border-space-700 mb-1" />

        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Low (Arid)</span>
          <span>Baseline</span>
          <span>High (Saturated)</span>
        </div>

        <div className="mt-2 pt-2 border-t border-space-800 text-[10px] text-gray-400 flex items-center justify-between">
          <span>Grid: 0.25° (~25 km)</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            NASA EPSG:4326
          </span>
        </div>
      </div>

      {/* Cursor Coordinates Bar */}
      {cursorCoords && (
        <div className="absolute bottom-2 left-24 z-10 text-[10px] text-gray-400 font-mono bg-space-950/80 px-2 py-0.5 rounded border border-space-800">
          Lon: {cursorCoords.lon}° | Lat: {cursorCoords.lat}°
        </div>
      )}
    </div>
  );
};
