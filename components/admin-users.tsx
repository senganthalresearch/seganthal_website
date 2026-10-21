"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Search, ShieldCheck, UserPlus } from "lucide-react";
import type { Member } from "@/lib/types";
import { memberSchema } from "@/lib/site-settings";
import { can, permissionNames, roleNames, type Permission } from "@/lib/permissions";
import { csvCell } from "@/lib/analytics";

const empty: Member = { email: "", name: "", role: "standard", active: true, permissions: {} };
const previewMembers: Member[] = [{ ...empty, email: "sample@example.com", name: "Sample Member", username: "sample123", authProvider: "google" }];
const validUntil = (value?: string) => Boolean(value && Date.parse(value) > Date.now());
const accessLabel = (member: Member) => member.role === "admin" ? "Admin · free" : !member.active ? "Revoked" : validUntil(member.adminGrantUntil) ? "Admin grant" : validUntil(member.paidUntil) ? "Paid" : "Payment needed";

export function AdminUsers({ preview, currentEmail, onError }: { preview: boolean; currentEmail: string; onError: (message: string) => void }) {
  const [members, setMembers] = useState<Member[]>(preview ? previewMembers : []);
  const [owners, setOwners] = useState<string[]>(preview ? [currentEmail] : []);
  const [selected, setSelected] = useState<Member>(empty);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [grantDays, setGrantDays] = useState(365);
  const [grantReason, setGrantReason] = useState("");
  useEffect(() => {
    if (selected.email && window.innerWidth <= 1100) document.querySelector(".admin-user-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected.email]);
  const load = useCallback(async () => {
    if (preview) return;
    const response = await fetch("/api/members", { cache: "no-store" });
    const data = await response.json() as { members?: Member[]; owners?: string[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load members.");
    setMembers(data.members || []); setOwners(data.owners || []);
  }, [preview]);
  useEffect(() => { void load().catch(error => onError(error.message)); }, [load, onError]);
  const accounts = useMemo(() => [...owners.map(email => ({ ...empty, email, name: "Owner", role: "admin" as const, authProvider: "google" as const })), ...members.filter(member => !owners.includes(member.email))], [owners, members]);
  const visible = accounts.filter(member => {
    const term = `${member.name || ""} ${member.email} ${member.username || ""} ${member.phone || ""}`.toLowerCase();
    return term.includes(query.toLowerCase()) && (filter === "all" || filter === "paid" && validUntil(member.paidUntil) || filter === "grant" && validUntil(member.adminGrantUntil) || filter === "unpaid" && accessLabel(member) === "Payment needed" || filter === "revoked" && !member.active || filter === "admin" && member.role === "admin");
  });
  const pageCount = Math.max(1, Math.ceil(visible.length / 25));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(currentPage * 25, currentPage * 25 + 25);
  const selectedProtected = Boolean(selected.email) && (owners.includes(selected.email) || selected.email === currentEmail);

  async function send(url: string, method: "POST" | "DELETE", body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error || "Could not update member.");
  }
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setNotice(""); onError("");
    try { await action(); setNotice(success); await load(); }
    catch (error) { onError(error instanceof Error ? error.message : "Could not update member."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const input = memberSchema.parse(selected);
      if (preview) setMembers(old => [...old.filter(member => member.email !== input.email), input]);
      else await send("/api/members", "POST", input);
      setSelected(empty);
    }, "Member saved.");
  }
  async function grant(days: number) {
    if (!selected.email) return;
    if (!grantReason.trim()) { onError("Add a reason for the access grant or revocation."); return; }
    await run(async () => {
      if (preview) setMembers(old => old.map(member => member.email === selected.email ? { ...member, adminGrantUntil: days ? new Date(Date.now() + days * 86400000).toISOString() : "" } : member));
      else await send("/api/members/grant", "POST", { target: selected.phone || selected.email, days, reason: grantReason });
      setSelected(member => ({ ...member, adminGrantUntil: days ? new Date(Date.now() + days * 86400000).toISOString() : "" }));
    }, days ? "Complimentary access granted." : "Complimentary access revoked.");
  }
  async function remove() {
    if (!selected.email || !window.confirm(`Remove ${selected.email}? This does not cancel a paid subscription.`)) return;
    await run(async () => { if (preview) setMembers(old => old.filter(member => member.email !== selected.email)); else await send("/api/members", "DELETE", { email: selected.email }); setSelected(empty); }, "Member removed.");
  }
  function exportCsv() {
    const rows = [["Name", "Username", "Email", "Phone", "Sign-in", "Role", "Status", "Paid until", "Admin grant until"], ...accounts.map(member => [member.name || "", member.username || "", member.authProvider === "phone" ? "" : member.email, member.phone || "", member.authProvider || "google", member.role, accessLabel(member), member.paidUntil || "", member.adminGrantUntil || ""])];
    const blob = new Blob(["\uFEFF", rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "senganthal-members.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <section className="admin-user-panel"><header><div><span className="eyebrow">ACCESS CONTROL</span><h2>Members</h2><p>Manage paid access, complimentary grants and account permissions.</p></div><div className="link-row"><button className="button secondary" onClick={exportCsv}><Download size={16}/>Export</button><button className="button primary" onClick={() => setSelected(empty)}><UserPlus size={16}/>Add Google member</button></div></header><div className="admin-user-summary">{[["All accounts", accounts.length], ["Paid access", accounts.filter(member => validUntil(member.paidUntil)).length], ["Admin grants", accounts.filter(member => validUntil(member.adminGrantUntil)).length], ["Needs payment", accounts.filter(member => accessLabel(member) === "Payment needed").length]].map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div><div className="admin-user-workspace"><div className="admin-user-list"><div className="admin-user-filters"><label><Search size={16}/><input aria-label="Search users" placeholder="Search name, username, email or phone" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label><select aria-label="Filter by access" value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}><option value="all">All access</option><option value="paid">Paid</option><option value="grant">Admin grant</option><option value="unpaid">Needs payment</option><option value="revoked">Revoked</option><option value="admin">Admins</option></select></div><div className="admin-user-rows">{pageRows.map(member => <button className={selected.email === member.email ? "admin-user-row selected" : "admin-user-row"} key={member.email} onClick={() => { setSelected({ ...member, permissions: member.permissions || {} }); setGrantReason(""); }}><span className="admin-user-avatar">{(member.name || member.username || member.email).slice(0, 1).toUpperCase()}</span><span className="admin-user-ident"><strong>{member.name || member.username || member.email}</strong><small>{member.phone || member.username || member.email}</small></span><span className={`admin-user-status ${accessLabel(member).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{accessLabel(member)}</span></button>)}{!visible.length && <p className="small muted">No matching members.</p>}</div><nav className="admin-user-pagination" aria-label="Member pages"><span>{visible.length ? `${currentPage * 25 + 1}–${Math.min(visible.length, currentPage * 25 + 25)} of ${visible.length}` : "0 members"}</span><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></nav></div><div className="admin-user-detail"><div className="section-title"><div><h3>{selected.email ? "Member details" : "Add a Google member"}</h3><span>{selected.email ? selected.authProvider === "phone" ? "Verified mobile account" : "Google account" : "Members can also register themselves with Google or mobile OTP"}</span></div><ShieldCheck size={20}/></div>{selectedProtected && <p className="small muted">Owner or current administrator settings are protected.</p>}<form onSubmit={event => void save(event)}><label>Email<input type="email" required disabled={Boolean(selected.email && members.some(member => member.email === selected.email)) || selectedProtected} value={selected.email} onChange={event => setSelected({ ...selected, email: event.target.value })} /></label><label>Full name<input maxLength={100} value={selected.name || ""} disabled={selectedProtected} onChange={event => setSelected({ ...selected, name: event.target.value })} /></label>{selected.username && <p className="small muted">Username: <strong>{selected.username}</strong></p>}<div className="form-grid"><label>Role<select value={selected.role} disabled={selectedProtected} onChange={event => setSelected({ ...selected, role: event.target.value as Member["role"], permissions: {} })}>{Object.entries(roleNames).filter(([role]) => role !== "member").map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={selected.active} disabled={selectedProtected} onChange={event => setSelected({ ...selected, active: event.target.checked })} />Account active</label></div><details><summary>Feature permissions</summary><div className="admin-user-permissions">{Object.entries(permissionNames).map(([permission, label]) => <label key={permission} className="checkbox-label"><input type="checkbox" disabled={selectedProtected || selected.role === "admin"} checked={can({ ...selected, active: true }, permission as Permission)} onChange={event => setSelected({ ...selected, permissions: { ...selected.permissions, [permission]: event.target.checked } })} />{label}</label>)}</div></details><button className="button primary" disabled={busy || selectedProtected}>Save member</button></form>{selected.email && !selectedProtected && <div className="admin-user-grant"><h3>Complimentary access</h3><p className="small muted">Grant access without a payment. Paid access stays separate.</p><div className="form-grid"><label>Days<select value={grantDays} onChange={event => setGrantDays(Number(event.target.value))}><option value="7">7 days</option><option value="30">30 days</option><option value="365">1 year</option><option value="3650">10 years</option></select></label><label>Reason<input maxLength={300} value={grantReason} onChange={event => setGrantReason(event.target.value)} placeholder="Why is access granted?" /></label></div><div className="link-row"><button className="button secondary" disabled={busy} onClick={() => void grant(grantDays)}>Grant access</button>{validUntil(selected.adminGrantUntil) && <button className="text-button" disabled={busy} onClick={() => void grant(0)}>Revoke grant</button>}</div><p className="small muted">Paid through: {selected.paidUntil ? new Date(selected.paidUntil).toLocaleDateString("en-IN") : "None"} · Grant through: {selected.adminGrantUntil ? new Date(selected.adminGrantUntil).toLocaleDateString("en-IN") : "None"}</p><button className="text-button danger-text" disabled={busy} onClick={() => void remove()}>Remove member</button></div>}{notice && <p className="alert" role="status">{notice}</p>}</div></div></section>;
}
