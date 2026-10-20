"use client";
import {useState} from 'react';
import {companyDomains} from '@/lib/company-logos';
export function CompanyLogo({symbol,name,size=34}:{symbol:string;name?:string;size?:number}){
 const clean=symbol.replace(/\.NS$/,''),[failed,setFailed]=useState('');
 const src=companyDomains[clean]?'/company-logos/'+encodeURIComponent(clean)+'.png':'/api/company-logo?symbol='+encodeURIComponent(symbol);
 return <span className="company-logo" style={{width:size,height:size}} title={name||symbol}>{failed!==src&&!symbol.startsWith('^')?<img src={src} alt="" loading="lazy" onError={()=>setFailed(src)}/>:<span>{clean.replace(/[^A-Z0-9]/g,'').slice(0,2)}</span>}</span>;
}
