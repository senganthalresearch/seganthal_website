"use client";
import { useState, type FormEvent } from "react";
import { dailyStockSchema, type SiteSettings } from "@/lib/site-settings";

export function DailyStockEditor({ settings, onSettings, preview }: { settings: SiteSettings; onSettings: (settings: SiteSettings) => void; preview: boolean }) {
  const [value, setValue] = useState(settings.dailyStock);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const dailyStock = dailyStockSchema.parse(value);
      if (!preview) {
        const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "dailyStock", value: dailyStock }) });
        const data = await response.json() as {error?:string};
        if (!response.ok) throw new Error(data.error || "Could not save today’s stock.");
      }
      onSettings({ ...settings, dailyStock });
      setMessage(preview ? "Updated preview." : "Today’s stock alert is published.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save today’s stock."); }
    finally { setBusy(false); }
  }
  return <section className="panel admin-section daily-stock-editor"><div className="section-title"><div><h2>Today’s stock alert</h2><span>One dated stock on the public homepage; the full note appears in the member dashboard</span></div></div><form onSubmit={event => void save(event)}><label className="checkbox-label"><input type="checkbox" checked={value.enabled} onChange={event => setValue({ ...value, enabled: event.target.checked })} /> Publish alert</label><div className="form-grid three"><label>Date in India<input type="date" required value={value.date} onChange={event => setValue({ ...value, date: event.target.value })} /></label><label>Stock symbol<input required maxLength={20} value={value.symbol} onChange={event => setValue({ ...value, symbol: event.target.value.toUpperCase() })} /></label><label>Headline<input required maxLength={120} value={value.title} onChange={event => setValue({ ...value, title: event.target.value })} /></label></div><label>Research note<textarea required rows={4} maxLength={1200} value={value.note} onChange={event => setValue({ ...value, note: event.target.value })} /></label><p className="small muted">The alert disappears automatically after its date. Publish a new one each day.</p><button className="button primary" disabled={busy}>{busy ? "Saving…" : "Save today’s stock"}</button>{message && <p role="status">{message}</p>}</form></section>;
}
