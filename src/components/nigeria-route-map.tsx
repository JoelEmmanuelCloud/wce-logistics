import type { ComponentType } from "react";
import { NIGERIA_DOTS, NIGERIA_GRID } from "@/data/nigeria-dots";
import { BusIcon, ExcavatorIcon, TruckIcon } from "@/components/fleet-icons";

const CELL = 12;
const WIDTH = NIGERIA_GRID.columns * CELL;
const HEIGHT = NIGERIA_GRID.rows * CELL;

const HUBS = {
  lagos: { name: "Lagos", x: 30, y: 265 },
  abuja: { name: "Abuja", x: 175, y: 176 },
  kano: { name: "Kano", x: 212, y: 72 },
  maiduguri: { name: "Maiduguri", x: 376, y: 78 },
  portHarcourt: { name: "Port Harcourt", x: 158, y: 322 },
} as const;

const ROUTES = [
  "M30 265C70 205 110 230 175 176",
  "M175 176C150 130 230 120 212 72",
  "M212 72C270 40 320 120 376 78",
  "M175 176C215 220 120 270 158 322",
];

type Badge = {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  x: number;
  y: number;
};

const BADGES: Badge[] = [
  { label: "Buses", Icon: BusIcon, x: 92, y: 168 },
  { label: "Trucks", Icon: TruckIcon, x: 300, y: 40 },
  { label: "Heavy equipment", Icon: ExcavatorIcon, x: 250, y: 262 },
];

export function NigeriaRouteMap({ className }: { className?: string }) {
  return (
    <figure className={`relative ${className ?? ""}`}>
      <svg
        viewBox={`-6 -6 ${WIDTH + 12} ${HEIGHT + 12}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Map of Nigeria showing WCE Logistics routes linking Lagos, Abuja, Kano, Maiduguri and Port Harcourt"
      >
        <g fill="var(--color-navy)" fillOpacity="0.82">
          {NIGERIA_DOTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x * CELL} cy={y * CELL} r={3.7} />
          ))}
        </g>
        <g
          fill="none"
          stroke="var(--color-orange)"
          strokeWidth="3"
          strokeLinecap="round"
          className="route-lines"
        >
          {ROUTES.map((d) => (
            <path key={d} d={d} pathLength={1} />
          ))}
        </g>
        {Object.values(HUBS).map((hub) => (
          <g key={hub.name}>
            <circle cx={hub.x} cy={hub.y} r={9} fill="var(--color-orange)" />
            <circle cx={hub.x} cy={hub.y} r={3.5} fill="var(--color-navy)" />
            <title>{hub.name}</title>
          </g>
        ))}
      </svg>
      {BADGES.map(({ label, Icon, x, y }) => (
        <span
          key={label}
          title={label}
          className="absolute grid aspect-square w-[17%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(11,37,69,0.25)]"
          style={{ left: `${((x + 6) / (WIDTH + 12)) * 100}%`, top: `${((y + 6) / (HEIGHT + 12)) * 100}%` }}
        >
          <Icon className="w-[74%]" />
          <span className="sr-only">{label}</span>
        </span>
      ))}
    </figure>
  );
}
