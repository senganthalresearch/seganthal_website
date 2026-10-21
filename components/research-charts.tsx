"use client";
import { useId, useState } from "react";
import type { Candle } from "@/lib/types";
import { number } from "./ui";

const chart = { left: 12, right: 676, top: 20, bottom: 226, volumeBottom: 264 };
export function PriceChart({ history, label = "Daily close", currency = "₹" }: { history: Candle[]; label?: string; currency?: string }) {
  const [period, setPeriod] = useState(63);
  const [active, setActive] = useState<number | null>(null);
  const [style, setStyle] = useState<"line" | "candles">("line");
  const id = useId().replaceAll(":", "");
  const rows = (period ? history.slice(-period) : history).filter(row => Number.isFinite(row.close) && Number.isFinite(Date.parse(row.date)));
  if (rows.length < 2) return <div className="chart-unavailable">Price history is unavailable for this selection.</div>;
  const values = rows.map(row => row.close);
  const low = Math.min(...rows.map(row => Number.isFinite(row.low) ? row.low! : row.close)), high = Math.max(...rows.map(row => Number.isFinite(row.high) ? row.high! : row.close));
  const padding = Math.max((high - low) * .06, Math.abs(high) * .002, .01);
  const min = low - padding, max = high + padding, range = max - min;
  const priceY = (value: number) => chart.bottom - (value - min) / range * (chart.bottom - chart.top);
  const point = (index: number) => [chart.left + index / (rows.length - 1) * (chart.right - chart.left), priceY(rows[index].close)];
  const points = rows.map((_, index) => point(index).join(",")).join(" ");
  const color = values.at(-1)! >= values[0] ? "#159e83" : "#f04d66";
  const index = Math.min(active ?? rows.length - 1, rows.length - 1), selected = rows[index], xy = point(index);
  const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const shortDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
  const canShowCandles = rows.every(row => row.open !== undefined && row.high !== undefined && row.low !== undefined);
  const candleWidth = Math.max(1.5, Math.min(8, (chart.right - chart.left) / rows.length * .7));
  const maxVolume = Math.max(...rows.map(row => row.volume || 0));
  const ticks = [0, 1, 2, 3, 4].map(i => max - range * i / 4);
  const dates = [0, 1, 2, 3, 4].map(i => Math.round(i / 4 * (rows.length - 1)));
  return <div className="research-price-chart">
    <div className="chart-readout"><span>{label}</span><strong>{currency}{number(selected.close)} <small>{date(selected.date)}</small></strong><span className="chart-range">Low {currency}{number(low)} · High {currency}{number(high)}{canShowCandles && selected.open !== undefined ? ` · Open ${currency}${number(selected.open)}` : ""}{maxVolume > 0 ? ` · Volume ${number(selected.volume, 0)}` : ""}</span></div>
    <svg viewBox="0 0 800 302" tabIndex={0} role="img" aria-label={`${label}: ${rows.length} daily observations. Period low ${number(low)}, high ${number(high)}. Use arrow keys to inspect values.`} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setActive(Math.max(0, Math.min(rows.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)))); } }} onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); const relativeX = (event.clientX - box.left) / box.width * 800; setActive(Math.round(Math.max(0, Math.min(1, (relativeX - chart.left) / (chart.right - chart.left))) * (rows.length - 1))); }} onPointerLeave={() => setActive(null)}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity=".25"/><stop offset="1" stopColor={color} stopOpacity=".02"/></linearGradient></defs>
      {ticks.map((tick, i) => { const y = priceY(tick); return <g key={i}><line x1={chart.left} x2={chart.right} y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 4"/><text x="690" y={y + 4} fontSize="15" fill="var(--muted)">{currency}{number(tick, high < 100 ? 2 : 0)}</text></g>; })}
      {dates.map((rowIndex, i) => <g key={i}><line x1={point(rowIndex)[0]} x2={point(rowIndex)[0]} y1={chart.top} y2={chart.volumeBottom} stroke="var(--line)" strokeDasharray="2 5" opacity=".5"/><text x={point(rowIndex)[0]} y="289" textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fontSize="15" fill="var(--muted)">{shortDate(rows[rowIndex].date)}</text></g>)}
      {maxVolume > 0 && rows.map((row, i) => <rect key={i} x={point(i)[0] - candleWidth / 2} y={chart.volumeBottom - row.volume / maxVolume * 31} width={candleWidth} height={Math.max(1, row.volume / maxVolume * 31)} fill={row.open !== undefined && row.close < row.open ? "#f04d66" : "#159e83"} opacity=".32"/>)}
      {style === "candles" && canShowCandles ? rows.map((row, i) => { const x = point(i)[0], up = row.close >= row.open!, fill = up ? "#159e83" : "#f04d66", y1 = priceY(Math.max(row.open!, row.close)), y2 = priceY(Math.min(row.open!, row.close)); return <g key={i}><line x1={x} x2={x} y1={priceY(row.high!)} y2={priceY(row.low!)} stroke={fill} strokeWidth="1.3"/><rect x={x - candleWidth / 2} y={y1} width={candleWidth} height={Math.max(1.5, y2 - y1)} fill={fill}/></g>; }) : <><polygon points={`${chart.left},${chart.bottom} ${points} ${chart.right},${chart.bottom}`} fill={`url(#${id})`}/><polyline points={points} stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/></>}
      {active !== null && <><line x1={xy[0]} x2={xy[0]} y1={chart.top} y2={chart.volumeBottom} stroke="var(--muted)" strokeDasharray="3 3"/><line x1={chart.left} x2={chart.right} y1={xy[1]} y2={xy[1]} stroke="var(--muted)" strokeDasharray="3 3"/><circle cx={xy[0]} cy={xy[1]} r="4" fill={color} stroke="var(--surface)" strokeWidth="2"/><rect x="684" y={Math.max(12, Math.min(214, xy[1] - 12))} width="110" height="23" rx="4" fill="var(--ink)"/><text x="690" y={Math.max(28, Math.min(230, xy[1] + 4))} fontSize="11" fill="var(--surface)">{currency}{number(selected.close)}</text></>}
    </svg>
    <div className="chart-periods"><div className="chart-style">{canShowCandles && <><button aria-pressed={style === "line"} onClick={() => setStyle("line")}>Line</button><button aria-pressed={style === "candles"} onClick={() => setStyle("candles")}>Candles</button></>}</div>{[[21, "1M"], [63, "3M"], [126, "6M"], [252, "1Y"], [0, "All"]].map(([count, text]) => <button key={text} aria-pressed={period === count} onClick={() => { setPeriod(Number(count)); setActive(null); }}>{text}</button>)}</div>
  </div>;
}

export function ScoreGlyph({ stock }: { stock: { metrics: { good?: boolean }[]; score: number | null } }) {
  const id = useId(); const total = 6; const point = (i: number, r: number) => `${25 + Math.cos(i * Math.PI / 3 - Math.PI / 2) * r},${25 + Math.sin(i * Math.PI / 3 - Math.PI / 2) * r}`;
  const metrics = stock.metrics.filter(m => m.good !== undefined);
  return <svg viewBox="0 0 50 50" width="46" height="46" role="img" aria-labelledby={id}><title id={id}>Research quality {stock.score ?? "unavailable"} out of 100</title>{[10, 20].map(r => <polygon key={r} points={Array.from({ length: total }, (_, i) => point(i, r)).join(" ")} fill="none" stroke="#a8c5c2"/>)}{Array.from({ length: total }, (_, i) => <line key={i} x1="25" y1="25" x2={point(i, 20).split(",")[0]} y2={point(i, 20).split(",")[1]} stroke="#bfd6d1"/>)}<polygon points={Array.from({ length: total }, (_, i) => point(i, metrics[i] === undefined ? 3 : metrics[i].good ? 18 : 8)).join(" ")} fill="#4fc0a9" fillOpacity=".5" stroke="#3a9f8e"/></svg>;
}
