import { useMemo, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Path, Polygon, Rect } from "react-native-svg";

import { palette } from "@/constants/colors";
import type {
  GeoBoundary,
  GeoFeature,
  GeoFeatureCollection,
  GeoGeometry,
} from "@/types/geo";

type LngLat = [number, number];

/**
 * Self-hosted city map (M10). Renders ONLY the tenant's own geometry — the
 * boundary, barangay cells, and civic facilities served by the tenant-scoped
 * geo-service — plus an optional report/alert pin. No third-party tiles or
 * geocoder, so there is no per-request billing and no foreign geometry can
 * appear. Pure react-native-svg → identical on iOS, Android, and web export.
 *
 * The MapLibre + PMTiles raster basemap (styleUrl()) is the production upgrade;
 * this vector renderer is the dependency-free in-app MVP driven by the same data.
 */
export interface CivicMapProps {
  boundary: GeoBoundary;
  features?: GeoFeatureCollection;
  /** A single dropped pin (e.g. the report location). */
  pin?: { lat: number; lng: number } | null;
  /** Tap-to-move handler; enables interactive pin placement when provided. */
  onPickPin?: (lat: number, lng: number) => void;
  height?: number;
  rounded?: boolean;
}

function ringsOf(geometry: GeoGeometry): LngLat[][] {
  if (geometry.type === "Polygon") return geometry.coordinates as LngLat[][];
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as LngLat[][][]).flatMap((poly) => poly);
  }
  return [];
}

function pointOf(geometry: GeoGeometry): LngLat | null {
  return geometry.type === "Point" ? (geometry.coordinates as LngLat) : null;
}

function lineOf(geometry: GeoGeometry): LngLat[] {
  return geometry.type === "LineString" ? (geometry.coordinates as LngLat[]) : [];
}

export function CivicMap({
  boundary,
  features,
  pin,
  onPickPin,
  height = 200,
  rounded = true,
}: CivicMapProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Equirectangular projection over the padded boundary bbox. Cheap and exact
  // enough at city scale, where a full Mercator warp is imperceptible.
  const proj = useMemo(() => {
    const [minLng, minLat, maxLng, maxLat] = boundary.bbox;
    const padX = (maxLng - minLng) * 0.08 || 0.01;
    const padY = (maxLat - minLat) * 0.08 || 0.01;
    const west = minLng - padX;
    const east = maxLng + padX;
    const south = minLat - padY;
    const north = maxLat + padY;
    const W = width || 1;
    const H = height;
    return {
      project: (lng: number, lat: number): [number, number] => [
        ((lng - west) / (east - west)) * W,
        ((north - lat) / (north - south)) * H,
      ],
      invert: (x: number, y: number) => ({
        lng: west + (x / W) * (east - west),
        lat: north - (y / H) * (north - south),
      }),
    };
  }, [boundary.bbox, width, height]);

  const toPoints = (ring: LngLat[]) =>
    ring.map(([lng, lat]) => proj.project(lng, lat).join(",")).join(" ");

  const barangays = features?.features.filter((f) => f.properties.layer === "barangay") ?? [];
  const facilities = features?.features.filter((f) => f.properties.layer === "facility") ?? [];
  const routes = features?.features.filter((f) => f.properties.layer === "route") ?? [];
  const hazards = features?.features.filter((f) => f.properties.layer === "hazard") ?? [];

  const handlePress = (x: number, y: number) => {
    if (!onPickPin || !width) return;
    const { lat, lng } = proj.invert(x, y);
    onPickPin(lat, lng);
  };

  const pinXY = pin ? proj.project(pin.lng, pin.lat) : null;

  const svg =
    width > 0 ? (
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={palette.tint} />
        {/* hazard zones (under everything) */}
        {hazards.flatMap((f, i) =>
          ringsOf(f.geometry).map((ring, j) => (
            <Polygon
              key={`hz-${i}-${j}`}
              points={toPoints(ring)}
              fill={palette.danger}
              fillOpacity={0.12}
              stroke={palette.danger}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          )),
        )}
        {/* city boundary fill + outline */}
        {ringsOf(boundary.geometry).map((ring, j) => (
          <Polygon
            key={`bnd-${j}`}
            points={toPoints(ring)}
            fill={palette.brand}
            fillOpacity={0.05}
            stroke={palette.brand}
            strokeWidth={1.6}
          />
        ))}
        {/* barangay cells */}
        {barangays.flatMap((f, i) =>
          ringsOf(f.geometry).map((ring, j) => (
            <Polygon
              key={`brgy-${i}-${j}`}
              points={toPoints(ring)}
              fill="none"
              stroke={palette["fg-2"]}
              strokeOpacity={0.5}
              strokeWidth={0.8}
              strokeDasharray="3,3"
            />
          )),
        )}
        {/* transport routes */}
        {routes.map((f, i) => {
          const pts = lineOf(f.geometry);
          if (pts.length < 2) return null;
          const d = pts
            .map(([lng, lat], k) => {
              const [x, y] = proj.project(lng, lat);
              return `${k === 0 ? "M" : "L"}${x},${y}`;
            })
            .join(" ");
          return <Path key={`rt-${i}`} d={d} stroke={palette.accent} strokeWidth={1.5} fill="none" />;
        })}
        {/* civic facilities */}
        <G>
          {facilities.map((f: GeoFeature, i) => {
            const p = pointOf(f.geometry);
            if (!p) return null;
            const [x, y] = proj.project(p[0], p[1]);
            return (
              <Circle
                key={`fac-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill={palette.accent}
                stroke={palette.surface}
                strokeWidth={1.2}
              />
            );
          })}
        </G>
        {/* dropped pin */}
        {pinXY ? (
          <G>
            <Circle cx={pinXY[0]} cy={pinXY[1]} r={9} fill={palette.danger} fillOpacity={0.2} />
            <Circle
              cx={pinXY[0]}
              cy={pinXY[1]}
              r={5}
              fill={palette.danger}
              stroke={palette.surface}
              strokeWidth={1.6}
            />
          </G>
        ) : null}
      </Svg>
    ) : null;

  const style = {
    width: "100%" as const,
    height,
    borderRadius: rounded ? 16 : 0,
    overflow: "hidden" as const,
    backgroundColor: palette.tint,
  };

  if (onPickPin) {
    return (
      <Pressable
        onLayout={onLayout}
        onPress={(e) => handlePress(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        style={style}
        accessibilityRole="adjustable"
        accessibilityLabel="Tap the map to set the report location"
      >
        {svg}
      </Pressable>
    );
  }
  return (
    <View onLayout={onLayout} style={style}>
      {svg}
    </View>
  );
}
