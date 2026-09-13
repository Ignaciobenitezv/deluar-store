import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import countries50m from "world-atlas/countries-50m.json";
import { overviewColor, overviewUi } from "./overview-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const WIDTH = 300;
const HEIGHT = 320;

/**
 * Province centroids, used only to place a marker inside the real country
 * outline. The outline itself comes from the TopoJSON, never from hand-drawn
 * geometry.
 */
const PROVINCE_POINTS: Record<string, [number, number]> = {
  "buenos aires": [-60.0, -36.5],
  "ciudad autonoma de buenos aires": [-58.44, -34.61],
  catamarca: [-66.9, -27.3],
  chaco: [-60.5, -26.4],
  chubut: [-68.5, -43.8],
  cordoba: [-63.8, -32.1],
  corrientes: [-57.8, -28.8],
  "entre rios": [-59.2, -32.0],
  formosa: [-60.0, -24.9],
  jujuy: [-65.6, -23.2],
  "la pampa": [-65.5, -37.1],
  "la rioja": [-67.2, -29.9],
  mendoza: [-68.5, -34.6],
  misiones: [-54.6, -27.0],
  neuquen: [-70.0, -38.6],
  "rio negro": [-67.2, -40.4],
  salta: [-64.8, -24.6],
  "san juan": [-68.9, -31.0],
  "san luis": [-66.1, -33.8],
  "santa cruz": [-70.0, -48.8],
  "santa fe": [-60.9, -30.9],
  "santiago del estero": [-63.3, -27.8],
  "tierra del fuego": [-67.5, -54.0],
  tucuman: [-65.3, -26.9],
};

function normalizeProvince(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

  if (/^(caba|capital federal|ciudad de buenos aires)$/.test(base)) {
    return "ciudad autonoma de buenos aires";
  }

  if (base.startsWith("tierra del fuego")) {
    return "tierra del fuego";
  }

  return base;
}

/**
 * The country outline and projection are resolved once per process: the
 * TopoJSON never reaches the browser, only the resulting path.
 */
const argentina = (() => {
  const topology = countries50m as unknown as Topology;
  const collection = feature(topology, topology.objects.countries) as unknown as {
    features: Feature<Geometry, { name: string }>[];
  };
  const shape = collection.features.find((item) => item.properties?.name === "Argentina");

  if (!shape) {
    return null;
  }

  const projection = geoMercator().fitExtent(
    [
      [10, 10],
      [WIDTH - 10, HEIGHT - 10],
    ],
    shape,
  );

  return { path: geoPath(projection)(shape), projection };
})();

type ProvinceRow = {
  province: string;
  orders: number;
  revenue: number;
};

export function ArgentinaMap({ rows }: { rows: ProvinceRow[] }) {
  const leader = Math.max(...rows.map((row) => row.revenue), 0);

  const markers = argentina
    ? rows
        .map((row) => {
          const point = PROVINCE_POINTS[normalizeProvince(row.province)];

          if (!point) {
            return null;
          }

          const projected = argentina.projection(point);

          if (!projected) {
            return null;
          }

          return {
            province: row.province,
            orders: row.orders,
            revenue: row.revenue,
            x: projected[0],
            y: projected[1],
          };
        })
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null)
    : [];

  return (
    <div className="px-6 pb-6">
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Distribución de facturación por provincia"
          className="h-[300px] w-auto"
        >
          {argentina?.path ? (
            <path d={argentina.path} fill="#eef2f7" stroke="#dbe2ea" strokeWidth={1} />
          ) : null}

          {markers.map((marker) => {
            const share = leader > 0 ? marker.revenue / leader : 0;

            return (
              <g key={marker.province}>
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={5 + share * 9}
                  fill={overviewColor.series}
                  fillOpacity={0.22}
                />
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={3 + share * 3}
                  fill={overviewColor.series}
                >
                  <title>
                    {`${marker.province}: ${formatDashboardNumber(marker.orders)} ${
                      marker.orders === 1 ? "orden" : "órdenes"
                    } · ${formatDashboardPrice(marker.revenue)}`}
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-b border-[#e3e8ef] pb-2">
        <p className={overviewUi.label}>Provincia</p>
        <div className="flex shrink-0 items-center gap-6">
          <p className={cn(overviewUi.label, "w-12 text-right")}>Órdenes</p>
          <p className={cn(overviewUi.label, "w-[84px] text-right")}>Facturación</p>
        </div>
      </div>

      <ul>
        {rows.map((row) => (
          <li
            key={row.province}
            className="flex items-center justify-between gap-4 border-b border-[#eef2f7] py-2.5 last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-slate-900">
              {row.province}
            </span>
            <span className="flex shrink-0 items-center gap-6">
              <span className="w-12 text-right text-[13.5px] tabular-nums text-slate-600">
                {formatDashboardNumber(row.orders)}
              </span>
              <span className="w-[84px] text-right text-[13.5px] font-semibold tabular-nums text-slate-900">
                {formatDashboardPrice(row.revenue)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
