"use client";
import { ArrowDownRight, ArrowUpRight, LoaderCircle, Info, SearchX } from "lucide-react";
import type { Candle, Metric } from "@/lib/types";
export function number(value: number | null | undefined, digits = 2) { return value == null ? "—" : new Intl.NumberFormat("en-IN", {maximumFractionDigits: digits}).format(value); }
export function money(value: number | null | undefined) { return value == null ? "—" : "₹" + number(value); }
export function metricValue(metric: Metric) {
  if (metric.value === null) return "Not available";
  if (metric.unit === "₹" && Math.abs(metric.value) >= 10000000) return "₹" + number(metric.value / 10000000, 0) + " Cr";
  return (metric.unit === "₹" ? "₹" : "") + number(metric.value) + (metric.unit !== "₹" ? metric.unit : "");
}
export function Change({value}: {value: number | null}) { return <span className={value == null ? "muted" : value >= 0 ? "positive change" : "negative change"}>{value == null ? "—" : <>{value >= 0 ? <ArrowUpRight size={15}/> : <ArrowDownRight size={15}/>} {value >= 0 ? "+" : ""}{number(value)}%</>}</span>; }
export function Loading({text = "Loading research…"}: {text?: string}) { return <div className="loading" role="status"><LoaderCircle className="spin" size={24}/><span>{text}</span></div>; }
export function Empty({title, text}: {title: string; text: string}) { return <div className="empty"><SearchX size={30}/><h3>{title}</h3><p>{text}</p></div>; }
export function Notice({children}: {children: React.ReactNode}) { return <div className="notice"><Info size={17}/><span>{children}</span></div>; }
export function Chart({history, compact = false}: {history: Candle[]; compact?: boolean}) {
  if (history.length < 2) return <Empty title="Chart unavailable" text="Price history will appear when the data provider responds."/>;
  const values = history.map(v => v.close), min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((v, i) => `${i / (values.length - 1) * 800},${180 - (v - min) / range * 150}`).join(" ");
  return <div className={compact ? "chart compact" : "chart"}><svg viewBox="0 0 800 210" role="img" aria-label="Closing price history"><defs><linearGradient id={compact ? "area-mini" : "area-main"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#167465" stopOpacity=".16"/><stop offset="100%" stopColor="#167465" stopOpacity="0"/></linearGradient></defs>{[35, 85, 135, 185].map(y => <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="#e7ecef" strokeDasharray="4 5"/>)}<polygon points={"0,210 " + points + " 800,210"} fill={`url(#${compact ? "area-mini" : "area-main"})`}/><polyline fill="none" stroke="#167465" strokeWidth="2.5" points={points}/></svg><div className="chart-labels"><span>{new Date(history[0].date).toLocaleDateString("en-IN", {month:"short", year:"numeric"})}</span><span>Daily close · INR</span><span>{new Date(history.at(-1)!.date).toLocaleDateString("en-IN", {month:"short", year:"numeric"})}</span></div></div>;
}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, signal: options.signal || AbortSignal.timeout(55000), headers: { ...(typeof options.body === "string" ? {"Content-Type": "application/json"} : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Unable to complete this request. Please try again.");
  return body;
}

