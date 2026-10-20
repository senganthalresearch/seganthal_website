"use client";
import { useId, useState } from "react";
import type { Candle } from "@/lib/types";
import { number } from "./ui";

const chart = { left: 78, right: 586, top: 22, bottom: 174 };
export function PriceChart({ history, label = "Daily close", currency = "₹" }: { history: Candle[]; label?: string; currency?: string }) {
  const [period, setPeriod] = useState(63);
  const [active, setActive] = useState<number | null>(null);
  const id = useId().replaceAll(":", "");
  const rows = (period ? history.slice(-period) : history).filter(row => Number.isFinite(row.close));
  if (rows.length < 2) return <div className="chart-unavailable">Price history is unavailable for this selection.</div>;
  const values = rows.map(row => row.close);
  const low = Math.min(...rows.map(row => Number.isFinite(row.low) ? row.low! : row.close)), high = Math.max(...rows.map(row => Number.isFinite(row.high) ? row.high! : row.close));
  const padding = Math.max((high - low) * .1, Math.abs(high) * .005, 1);
  const min = low - padding, max = high + padding, range = max - min;
  const point = (index: number) => [chart.left + index / (rows.length - 1) * (chart.right - chart.left), chart.bottom - (rows[index].close - min) / range * (chart.bottom - chart.top)];
  const points = rows.map((_, index) => point(index).join(",")).join(" ");
  const color = values.at(-1)! >= values[0] ? "#159e83" : "#f04d66";
  const index = Math.min(active ?? rows.length - 1, rows.length - 1), selected = rows[index], xy = point(index);
  const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return <div className="research-price-chart">
    <div className="chart-readout"><span>{label}</span><strong>{currency}{number(selected.close)} <small>{date(selected.date)}</small></strong><span className="chart-range">Period low {currency}{number(low)} · high {currency}{number(high)}</span></div>
    <svg viewBox="0 0 610 220" tabIndex={0} role="img" aria-label={`${label}: ${rows.length} daily observations. Period low ${number(low)}, high ${number(high)}. Use arrow keys to inspect values.`} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setActive(Math.max(0, Math.min(rows.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)))); } }} onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); const relativeX = (event.clientX - box.left) / box.width * 610; setActive(Math.round(Math.max(0, Math.min(1, (relativeX - chart.left) / (chart.right - chart.left))) * (rows.length - 1))); }} onPointerLeave={() => setActive(null)}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity=".25"/><stop offset="1" stopColor={color} stopOpacity=".02"/></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(i => { const y = chart.top + i / 4 * (chart.bottom - chart.top); return <g key={i}><line x1={chart.left} x2={chart.right} y1={y} y2={y} stroke="var(--line)" strokeDasharray="4 4"/><text x={chart.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{number(max - range * i / 4, high < 100 ? 2 : 0)}</text></g>; })}
      <polygon points={`${chart.left},${chart.bottom} ${points} ${chart.right},${chart.bottom}`} fill={`url(#${id})`}/>
      <polyline points={points} stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
      {active !== null && <><line x1={xy[0]} x2={xy[0]} y1={chart.top} y2={chart.bottom} stroke="var(--muted)" strokeDasharray="3 3"/><circle cx={xy[0]} cy={xy[1]} r="4" fill={color} stroke="var(--surface)" strokeWidth="2"/></>}
      <text x={chart.left} y="204" fontSize="11" fill="var(--muted)">{date(rows[0].date)}</text><text x={chart.right} y="204" textAnchor="end" fontSize="11" fill="var(--muted)">{date(rows.at(-1)!.date)}</text>
    </svg>
    <div className="chart-periods">{[[21, "1M"], [63, "3M"], [126, "6M"], [252, "1Y"], [0, "All"]].map(([count, text]) => <button key={text} aria-pressed={period === count} onClick={() => { setPeriod(Number(count)); setActive(null); }}>{text}</button>)}</div>
  </div>;
}

export function ScoreGlyph({ stock }: { stock: { metrics: { good?: boolean }[]; score: number | null } }) {
  const id = useId(); const total = 6; const point = (i: number, r: number) => `${25 + Math.cos(i * Math.PI / 3 - Math.PI / 2) * r},${25 + Math.sin(i * Math.PI / 3 - Math.PI / 2) * r}`;
  const metrics = stock.metrics.filter(m => m.good !== undefined);
  return <svg viewBox="0 0 50 50" width="46" height="46" role="img" aria-labelledby={id}><title id={id}>Research quality {stock.score ?? "unavailable"} out of 100</title>{[10, 20].map(r => <polygon key={r} points={Array.from({ length: total }, (_, i) => point(i, r)).join(" ")} fill="none" stroke="#a8c5c2"/>)}{Array.from({ length: total }, (_, i) => <line key={i} x1="25" y1="25" x2={point(i, 20).split(",")[0]} y2={point(i, 20).split(",")[1]} stroke="#bfd6d1"/>)}<polygon points={Array.from({ length: total }, (_, i) => point(i, metrics[i] === undefined ? 3 : metrics[i].good ? 18 : 8)).join(" ")} fill="#4fc0a9" fillOpacity=".5" stroke="#3a9f8e"/></svg>;
}
