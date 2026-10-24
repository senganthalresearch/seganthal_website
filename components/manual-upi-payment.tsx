'use client';
import { useCallback, useEffect, useState } from 'react';
import { request } from './ui';
import type { ManualPayment } from '@/lib/manual-payment-rules';
export type ManualList = {settings:{enabled:boolean;recipient:string;qr:string};rows:Omit<ManualPayment,'screenshot'>[];page:number;pages:number;total:number};
export function ManualUpiPayment({active,admin,email,subscriptionOpen,onPendingChange}:{active:boolean;admin:boolean;email:string;subscriptionOpen:boolean;onPendingChange:(value:boolean)=>void}) {
  const [data,setData]=useState<ManualList|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [utr,setUtr]=useState(''),[payer,setPayer]=useState(''),[paidAt,setPaidAt]=useState(''),[proof,setProof]=useState(''),[consent,setConsent]=useState(false);
  const load=useCallback(async()=>{try{setData(await request<ManualList>('/api/manual-payments'));setError('');}catch(e){setError((e as Error).message);}},[]);
  useEffect(()=>{if(!admin)void load();},[admin,load]);
  useEffect(()=>{onPendingChange(Boolean(data?.rows.some(r=>r.status==='pending')));},[data,onPendingChange]);
  async function file(file?:File) {
    setProof('');setError('');
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setError('Choose a JPG, PNG or WebP screenshot up to 2 MB.');return;}
    const reader=new FileReader();reader.onload=()=>setProof(String(reader.result));reader.onerror=()=>setError('Could not read the screenshot. Please choose it again.');reader.readAsDataURL(file);
  }
  async function submit(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try{await request('/api/manual-payments',{method:'POST',body:JSON.stringify({action:'submit',utr,payerName:payer,paidAt:new Date(paidAt).toISOString(),screenshot:proof,consent})});setProof('');setNotice('Payment submitted. Your tools remain locked until an administrator confirms receipt. You can check the review status here.');await load();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  if(admin)return null;
  const pending=data?.rows.some(r=>r.status==='pending');
  return <section className="manual-upi"><h3>Pay by UPI · manual verification</h3>
    <p>₹599 for one year after approval. No automatic renewal. Your signed-in email, <strong>{email}</strong>, is attached automatically.</p>
    {error&&<p className="alert error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
    {!data?<button className="button secondary" onClick={()=>void load()}>Load UPI payment options</button>:<>
      {pending?<p className="notice">Your payment is awaiting admin verification. Do not pay again. Use Refresh status below to check the decision.</p>:active?<p className="notice">Your membership is active. No additional payment is needed.</p>:subscriptionOpen?<p className="notice">Your existing card subscription needs review before switching payment methods. Contact support before paying by UPI.</p>:!data.settings.enabled?<p className="notice">UPI payments are not open yet. Contact support if you have already paid.</p>:<div className="manual-upi-grid">
        <div className="manual-qr"><img src={data.settings.qr} alt={`Business UPI QR for ${data.settings.recipient}`} width={296} height={640}/><p><strong>Recipient: {data.settings.recipient}</strong></p><p>Check the recipient in your UPI app before paying ₹599.</p><a href={data.settings.qr} download="Senganthal-business-UPI.jpeg">Download QR to use on your phone</a></div>
        <form onSubmit={e=>void submit(e)}><h4>Already paid? Submit payment details</h4><p className="small muted">Enter the 12-digit UPI reference (UTR/RRN) from the transaction details, not the app’s internal transaction ID. Your UPI name is not detected automatically.</p>
          <label>Payer name as shown in your UPI app<input required maxLength={100} value={payer} onChange={e=>setPayer(e.target.value)}/></label>
          <label>UPI reference / UTR (12 digits)<input required inputMode="numeric" pattern="[0-9]{12}" maxLength={12} value={utr} onChange={e=>setUtr(e.target.value.trim())}/></label>
          <label>Payment date and time (your local time)<input required type="datetime-local" value={paidAt} onChange={e=>setPaidAt(e.target.value)}/></label>
          <label>Payment screenshot · JPG, PNG or WebP, up to 2 MB<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void file(e.target.files?.[0])}/></label>
          <p className="small muted">Show the successful payment, amount, recipient and UPI reference. Hide unrelated balances and transactions. Proof is visible only to you and administrators.</p>
          <label className="billing-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I paid ₹599 to this merchant and agree to the <a href="/terms-and-conditions">Terms</a> and <a href="/refund-policy">Refund policy</a>. Access starts after verification; renewal is manual.</span></label>
          <button className="button primary" disabled={busy||!proof||!consent}>{busy?'Submitting…':'Submit for verification'}</button>
        </form>
      </div>}
      <div className="public-actions"><button className="button secondary" onClick={()=>void load()}>Refresh status</button><a href="/contact">Payment support</a>{data.rows.some(r=>r.status==='approved'&&(r.end||0)>Date.now()/1000)&&<a className="button primary" href="/workspace">Open workspace</a>}</div>
      {!!data.rows.length&&<div className="table-wrap"><table><thead><tr><th>UPI reference</th><th>Amount</th><th>Review status</th><th>Membership ends / note</th></tr></thead><tbody>{data.rows.map(row=><tr key={row._id}><td>{row.utr}</td><td>₹599</td><td>{row.status==='approved'?'Paid via UPI — verified':row.status}</td><td>{row.status==='approved'?new Date(row.end!*1000).toLocaleDateString('en-IN'):row.note||'Awaiting merchant receipt check'}</td></tr>)}</tbody></table></div>}
    </>}
  </section>;
}
