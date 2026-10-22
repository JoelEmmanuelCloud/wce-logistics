"use client";

import { useState } from "react";
import { formatCompactNaira } from "@/lib/pricing";

export type ColumnPoint = { key: string; tick: string; title: string; value: number; valueLabel: string; detail: string };

const HEIGHT = 220;
const TOP = 12;
const BOTTOM = 28;
const LEFT = 56;
const MIN_SLOT = 32;
const MIN_WIDTH = 640;
const BAR = 20;
const RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

function columnPath(x: number, y: number, width: number, height: number): string {
  if (height <= 0) {
    return "";
  }
  const r = Math.min(RADIUS, height, width / 2);
  const bottom = y + height;
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${bottom} Z`;
}

export function ColumnChart({ points, unit, caption }: { points: ColumnPoint[]; unit: "naira" | "count"; caption: string }) {
  const formatTick = (value: number) => (unit === "naira" ? formatCompactNaira(value) : new Intl.NumberFormat("en-NG", { notation: "compact" }).format(value));
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((point) => point.value), 0));
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const slot = Math.max(MIN_SLOT, (MIN_WIDTH - LEFT - 8) / Math.max(points.length, 1));
  const width = LEFT + points.length * slot + 8;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const scale = (value: number) => (value / max) * plotHeight;
  const hovered = active === null ? null : points[active];

  return (
    <figure>
      <div className="overflow-x-auto">
        <div className="relative min-w-[560px]">
          <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="block h-auto w-full" aria-hidden="true" onMouseLeave={() => setActive(null)}>
            {ticks.map((tick) => {
              const y = TOP + plotHeight - scale(tick);
              return (
                <g key={tick}>
                  <line x1={LEFT} x2={width} y1={y} y2={y} className="stroke-navy/10" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  <text x={LEFT - 8} y={y} dy="0.32em" textAnchor="end" className="fill-navy/60 text-[11px] tabular-nums">
                    {formatTick(tick)}
                  </text>
                </g>
              );
            })}
            {points.map((point, index) => {
              const x = LEFT + index * slot + (slot - BAR) / 2;
              const barHeight = scale(point.value);
              return (
                <g key={point.key}>
                  <path d={columnPath(x, TOP + plotHeight - barHeight, BAR, barHeight)} className={active === index ? "fill-orange-ink" : "fill-orange-deep"} />
                  {(index % labelEvery === 0 || index === points.length - 1) && (
                    <text x={x + BAR / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-navy/60 text-[11px]">
                      {point.tick}
                    </text>
                  )}
                  <rect
                    x={LEFT + index * slot}
                    y={TOP}
                    width={slot}
                    height={plotHeight}
                    fill="transparent"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => setActive(active === index ? null : index)}
                  />
                </g>
              );
            })}
          </svg>
        {hovered && active !== null && (
          <div
            role="presentation"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-navy/10 bg-white px-3 py-2 text-[13px] shadow-[0_12px_32px_rgb(11_37_69/0.14)]"
            style={{ left: `min(max(${((LEFT + active * slot + slot / 2) / width) * 100}%, 80px), calc(100% - 80px))` }}
          >
            <p className="font-semibold text-navy">{hovered.title}</p>
            <p className="text-navy/80">{hovered.valueLabel}</p>
            <p className="text-navy/60">{hovered.detail}</p>
        </div>
      )}
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Value</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.title}</th>
              <td>{point.valueLabel}</td>
              <td>{point.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
