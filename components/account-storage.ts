"use client";
import {useEffect,useRef,useState} from 'react';
import {request} from './ui';
type Slot<T>={key:string;value:T;dirty:boolean;timer:ReturnType<typeof setTimeout>|null;active:boolean};
/** Debounced account storage. Drafts remain in the browser if a network save fails. */
export function useAccountStorage<T>(key:string,initial:T,preview:boolean,account:string){
 const [value,setValue]=useState<T>(initial),[status,setStatus]=useState('Loading saved research…'),[ready,setReady]=useState(false);
 const current=useRef<Slot<T>|null>(null),chain=useRef(Promise.resolve());
 const localKey=(k:string)=>`research-draft:${preview?'preview':account}:${k}`;
 function persist(slot:Slot<T>){if(!slot.dirty)return;slot.dirty=false;const snapshot=slot.value;try{localStorage.setItem(localKey(slot.key),JSON.stringify(snapshot))}catch{}if(preview){if(slot.active)setStatus('Saved in this preview browser');return}chain.current=chain.current.catch(()=>{}).then(async()=>{try{await request('/api/preferences',{method:'PUT',body:JSON.stringify({key:slot.key,value:snapshot}),keepalive:true});if(slot.active)setStatus('Saved to your account')}catch(e){slot.dirty=true;if(slot.active)setStatus('Not synced: '+(e as Error).message)}})}
 useEffect(()=>{const slot:Slot<T>={key,value:initial,dirty:false,timer:null,active:true};current.current=slot;setReady(false);setStatus('Loading saved research…');let draft=initial;try{const raw=localStorage.getItem(localKey(key));if(raw)draft=JSON.parse(raw)}catch{}slot.value=draft;setValue(draft);if(preview){setReady(true);setStatus('Saved in this preview browser')}else request<{value:T|null}>('/api/preferences?key='+encodeURIComponent(key)).then(r=>{if(!slot.active)return;const loaded=r.value??draft;slot.value=loaded;setValue(loaded);setReady(true);setStatus('Synced with your account')}).catch(e=>{if(slot.active){setStatus('Could not load account data: '+e.message);setReady(true)}});return()=>{slot.active=false;if(slot.timer)clearTimeout(slot.timer);persist(slot)}},[key,preview,account]);
 function update(next:T|((previous:T)=>T)){const slot=current.current;if(!slot||!ready)return;const updated=typeof next==='function'?(next as (previous:T)=>T)(slot.value):next;slot.value=updated;slot.dirty=true;setValue(updated);setStatus(preview?'Saving on this device…':'Saving to your account…');try{localStorage.setItem(localKey(key),JSON.stringify(updated))}catch{}if(slot.timer)clearTimeout(slot.timer);slot.timer=setTimeout(()=>persist(slot),600)}
 return {value,setValue:update,status,ready,retry:()=>{if(current.current){current.current.dirty=true;persist(current.current)}}};
}
