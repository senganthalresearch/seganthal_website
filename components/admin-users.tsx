'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Member } from '@/lib/types';
import { hasReviewerAccess } from '@/lib/reviewer-membership';
import { can, permissionNames, roleNames, type Permission } from '@/lib/permissions';
import { request } from './ui';

type Account = Member & { billing_live_until?: number; billing_test_until?: number };
type Result = { members: Account[]; owners: string[]; page: number; pages: number; total: number; mode: 'test'|'live'; summary: {total:number;paid:number;unpaid:number;expiring:number;suspended:number} };
type Detail = { member: Account; billing?: {status:string;paidUntil:number;subscriptionId?:string;cancelRequested?:boolean;periods?:{paymentId:string;amount:number;end:number;refunded:boolean}[]}; audit: {action:string;actor:string;createdAt:string}[] };
const empty: Member = { email:'', name:'', role:'standard', active:true, permissions:{} };
const sample: Account[] = Array.from({length:62},(_,i)=>({...empty,email:`member${String(i+1).padStart(3,'0')}@example.com`,name:`Sample member ${i+1}`,active:i%7!==0,emailVerifiedAt:'sample',onboardedAt:'sample',billing_test_until:i%3===0?Math.floor(Date.now()/1000)+86400*(i+1):0}));
const formatDate=(seconds:number)=>seconds?new Date(seconds*1000).toLocaleDateString('en-IN'):'—';

export function AdminUsers({preview,member,onError}:{preview:boolean;member:Member;onError:(message:string)=>void}) {
  const [result,setResult]=useState<Result|null>(null),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[role,setRole]=useState('all'),[status,setStatus]=useState('all'),[page,setPage]=useState(1);
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[form,setForm]=useState<Member|null>(null),[detail,setDetail]=useState<Detail|null>(null),[adding,setAdding]=useState(false);
  const [previewMembers,setPreviewMembers]=useState(sample),[revision,setRevision]=useState(0);
  const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>{const timer=setTimeout(()=>{setSearch(query);setPage(1)},300);return()=>clearTimeout(timer)},[query]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);
    if(preview){
      const now=Date.now()/1000, paid=(m:Account)=>m.active&&(m.billing_test_until||0)>now;
      const matches=previewMembers.filter(m=>(role==='all'||m.role===role)&&(!search||`${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase()))&&(status==='all'||status==='paid'&&paid(m)||status==='unpaid'&&m.active&&!paid(m)&&!hasReviewerAccess(m)||status==='reviewer'&&hasReviewerAccess(m)||status==='suspended'&&!m.active||status==='expiring'&&paid(m)&&(m.billing_test_until||0)<=now+30*86400));
      const pages=Math.max(1,Math.ceil(matches.length/25)),current=Math.min(page,pages);
      setResult({members:matches.slice((current-1)*25,current*25),owners:['owner@example.com'],page:current,pages,total:matches.length,mode:'test',summary:{total:previewMembers.length,paid:previewMembers.filter(paid).length,unpaid:previewMembers.filter(m=>m.active&&!paid(m)&&!hasReviewerAccess(m)).length,expiring:previewMembers.filter(m=>paid(m)&&(m.billing_test_until||0)<=now+30*86400).length,suspended:previewMembers.filter(m=>!m.active).length}});setLoading(false);return;
    }
    const params=new URLSearchParams({page:String(page),q:search,role,status});
    request<Result>(`/api/members?${params}`,{signal:controller.signal}).then(setResult).catch(e=>{if(!controller.signal.aborted)onError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[page,search,role,status,preview,previewMembers,revision,onError]);
  useEffect(()=>{if(form&&!dialog.current?.open)dialog.current?.showModal()},[form]);
  const close=useCallback(()=>{dialog.current?.close();setForm(null);setDetail(null);opener.current?.focus()},[]);
  async function view(account:Account,button:HTMLButtonElement){
    opener.current=button;setAdding(false);setDetail(null);setForm({...account,permissions:account.permissions||{}});
    if(preview){setDetail({member:account,audit:[]});return}
    try{const loaded=await request<Detail>(`/api/members?email=${encodeURIComponent(account.email)}`);setDetail(current=>dialog.current?.open?loaded:current)}catch(e){onError((e as Error).message)}
  }
  async function save(){
    if(!form)return;setSaving(true);onError('');
    try{
      const input={email:form.email,name:form.name,role:form.role,active:form.active,permissions:form.permissions,reviewerAccessUntil:form.role==='admin'?0:(form.reviewerAccessUntil||0)};
      if(preview)setPreviewMembers(old=>[...old.filter(m=>m.email!==input.email),{...form,...input}]);
      else await request('/api/members',{method:'POST',body:JSON.stringify({items:[input]})});
      setNotice(preview?'Preview account updated. No real user was changed.':'Member updated.');setRevision(v=>v+1);close();
    }catch(e){onError((e as Error).message)}finally{setSaving(false)}
  }
  const protectedAccount=!!form&&(result?.owners.includes(form.email)||form.email===member.email);
  return <section className="panel admin-section member-directory">
    <div className="section-title"><div><h2>User management</h2><p className="small muted">Search, review memberships and manage access in one place.</p></div><button className="button primary" onClick={e=>{opener.current=e.currentTarget;setAdding(true);setDetail(null);setForm({...empty})}}>Add member</button></div>
    {preview&&<div className="notice">Sample directory with 62 accounts. Changes stay in this preview.</div>}
    {notice&&<div className="notice" role="status">{notice}</div>}
    <div className="directory-summary">{(['total','paid','unpaid','expiring','suspended'] as const).map(key=><div key={key}><strong>{result?.summary[key]??'—'}</strong><span>{{total:'Directory users',paid:'Paid members',unpaid:'Payment required',expiring:'Expires within 30 days',suspended:'Suspended'}[key]}</span></div>)}</div>
    <p className="directory-owner">Protected owners: {result?.owners.join(', ')||'Loading…'} · Administrators have free access. {result?.mode==='test'?'Showing test memberships.':''}</p>
    <div className="directory-controls"><input aria-label="Search members" placeholder="Search name, email or phone" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select aria-label="Filter member role" value={role} onChange={e=>{setRole(e.target.value);setPage(1)}}><option value="all">All roles</option>{Object.entries(roleNames).filter(([key])=>key!=='member').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      <select aria-label="Filter membership" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="all">All memberships</option><option value="paid">Paid</option><option value="reviewer">Reviewer demo</option><option value="unpaid">Payment required</option><option value="expiring">Expiring soon</option><option value="suspended">Suspended</option></select></div>
    <div className="table-wrap" aria-busy={loading}><table className="directory-table"><thead><tr><th>Member</th><th>Role</th><th>Membership</th><th>Access ends</th><th>Actions</th></tr></thead><tbody>{result?.members.map(account=>{const review=hasReviewerAccess(account),end=review?account.reviewerAccessUntil||0:account[`billing_${result.mode}_until`]||0;return <tr key={account.email}><td><strong>{account.name||account.email.split('@')[0]}</strong><small>{account.email}</small></td><td>{roleNames[account.role]}</td><td>{!account.active?'Suspended':account.role==='admin'?'Admin · included':review?'Reviewer demo · no payment':end>Date.now()/1000?'Paid':'Payment required'}</td><td>{formatDate(end)}</td><td><button className="button secondary" onClick={e=>void view(account,e.currentTarget)}>View / edit</button></td></tr>})}</tbody></table>
      {!loading&&result?.members.length===0&&<p>No matching members. Try another search or filter.</p>}
    </div>
    <div className="directory-pagination"><span role="status">{loading?'Loading members…':`${result?.total||0} matches · 25 per page`}</span><div className="link-row"><button className="button secondary" disabled={loading||!result||result.page<=1} onClick={()=>setPage((result?.page||1)-1)}>Previous</button><span>Page {result?.page||1} of {result?.pages||1}</span><button className="button secondary" disabled={loading||!result||result.page>=result.pages} onClick={()=>setPage((result?.page||1)+1)}>Next</button></div></div>
    <dialog ref={dialog} className="member-dialog" aria-labelledby="member-dialog-title" onCancel={e=>{e.preventDefault();if(!saving)close()}}>
      {form&&<><div className="dialog-heading"><h2 id="member-dialog-title">{adding?'Add member':form.name||form.email}</h2><button type="button" className="button secondary" disabled={saving} onClick={close}>Close</button></div>
        <p className="small muted">Roles control features, not payment exemptions. Regular members still require a paid subscription. Users set their own passwords during account setup.</p>
        <form onSubmit={e=>{e.preventDefault();void save()}}><label>Email<input type="email" required value={form.email} disabled={!adding||saving} onChange={e=>setForm({...form,email:e.target.value})}/></label>
          <label>Name<input maxLength={100} value={form.name||''} disabled={protectedAccount||saving} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Role<select value={form.role} disabled={protectedAccount||saving} onChange={e=>setForm({...form,role:e.target.value as Member['role'],permissions:{}})}>{Object.entries(roleNames).filter(([key])=>key!=='member').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          {form.role==='admin'&&<p className="notice">Administrators have free access and can manage other users.</p>}
          <label className="checkbox-label"><input type="checkbox" disabled={protectedAccount||saving} checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Account active</label>
          {!adding&&form.role!=='admin'&&<fieldset><legend>Temporary Razorpay reviewer access</legend>
            <p className="small muted">Keeps the existing website password. Opens a labelled sample-data workspace without payment. Private member APIs and administrator tools remain blocked. No subscription or payment is recorded.</p>
            <p role="status">{hasReviewerAccess(form)?'Reviewer access expires '+new Date((form.reviewerAccessUntil||0)*1000).toLocaleString('en-IN'):form.reviewerAccessUntil?'Reviewer access expired or inactive.':'Reviewer access is not enabled.'}</p>
            <div className="link-row"><button type="button" className="button secondary" disabled={protectedAccount||saving||!form.active||!form.emailVerifiedAt||!form.onboardedAt} onClick={()=>setForm({...form,reviewerAccessUntil:Math.floor(Date.now()/1000)+14*86400})}>Grant / extend 14 days</button><button type="button" className="button secondary" disabled={protectedAccount||saving||!form.reviewerAccessUntil} onClick={()=>setForm({...form,reviewerAccessUntil:0})}>Remove reviewer access</button></div>
            {(!form.emailVerifiedAt||!form.onboardedAt)&&<p className="small muted">Complete this account’s email and password setup before granting reviewer access.</p>}
            <p className="small muted">Click Save member to apply. Access ends automatically; expired accounts return to the normal subscription rules.</p>
          </fieldset>}
          <details><summary>Advanced feature permissions</summary><fieldset className="permission-grid"><legend>Member permissions</legend>{Object.entries(permissionNames).map(([key,label])=><label className="checkbox-label" key={key}><input type="checkbox" disabled={protectedAccount||saving||form.role==='admin'} checked={can({...form,active:true},key as Permission)} onChange={e=>setForm({...form,permissions:{...form.permissions,[key]:e.target.checked}})}/>{label}</label>)}</fieldset></details>
          <button className="button primary" disabled={saving||protectedAccount}>{saving?'Saving…':'Save member'}</button>
        </form>
        {!adding&&<section className="billing-history"><h3>Subscription & payments</h3>{detail?<><p>{detail.billing?.status||'No subscription'}{detail.billing?.subscriptionId?` · ${detail.billing.subscriptionId}`:''}</p><p>Contact phone: {detail.member.contactPhone||'Not provided'}</p><ul>{detail.billing?.periods?.map(p=><li key={p.paymentId}>{p.paymentId} · ₹{p.amount/100} · {p.refunded?'Refunded':`Paid through ${formatDate(p.end)}`}</li>)}</ul><h3>Recent admin changes</h3>{detail.audit.length?<ul>{detail.audit.map((item,i)=><li key={i}>{item.action} · {item.actor} · {new Date(item.createdAt).toLocaleString('en-IN')}</li>)}</ul>:<p>No changes recorded.</p>}</>:<p>Loading account details…</p>}</section>}
      </>}
    </dialog>
  </section>;
}
