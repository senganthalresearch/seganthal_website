'use client';
import { useState } from 'react';
import { request } from './ui';

export function RecordPayment({onSaved}:{onSaved:()=>void}) {
  const [email,setEmail]=useState(''),[reference,setReference]=useState(''),[expiry,setExpiry]=useState(''),[note,setNote]=useState('');
  const [verified,setVerified]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  async function save(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      const result=await request<{emailSent:boolean}>('/api/manual-payments',{method:'POST',body:JSON.stringify({action:'record',email,utr:reference,amount:59900,end:Math.floor(new Date(expiry).getTime()/1000),note,verified})});
      setMessage('Payment recorded. The member now shows as Paid.'+(result.emailSent?'':' Notification email failed; retry from the payment review panel.'));
      setReference('');setVerified(false);onSaved();window.dispatchEvent(new Event('manual-payment-reviewed'));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <details><summary>Record verified payment</summary>
    <p>Use only after checking a successful ₹599 credit in your merchant account. This records a paid membership without a member-uploaded screenshot. It does not charge the member or cancel a card subscription.</p>
    <form onSubmit={save}>
      <label>Member email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>UPI / bank reference (12 digits)<input required inputMode="numeric" pattern="[0-9]{12}" maxLength={12} value={reference} onChange={e=>setReference(e.target.value)} /></label>
      <label>Amount received (INR)<input value="599" readOnly /></label>
      <label>Access expiry (your local time, within one year)<input type="datetime-local" required value={expiry} onChange={e=>setExpiry(e.target.value)} /></label>
      <label>Verification note<textarea required minLength={5} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Payment date, merchant receipt and verification details" /></label>
      <label className="billing-consent"><input type="checkbox" required checked={verified} onChange={e=>setVerified(e.target.checked)} /><span>I matched this reference and ₹599 credit in the merchant account. This is a real received payment.</span></label>
      <button className="button primary" disabled={busy||!verified}>{busy?'Recording…':'Record verified payment'}</button>
      {error&&<p role="alert" className="alert error">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}
    </form>
  </details>;
}
