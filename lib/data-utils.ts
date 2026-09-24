export function parseCsv(text:string): Record<string,string>[] {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}
 if(quoted)throw new Error('An opening CSV quote is missing its closing quote.');
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);const headers=(rows.shift()||[]).map(s=>s.replace(/^\uFEFF/,'').trim());
 return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]||''])));
}
export function numeric(value:unknown):number|null {if(value===null||value===undefined||String(value).trim()===''||value==='-')return null;const n=Number(String(value).replaceAll(',','').replace('%',''));return Number.isFinite(n)?n:null;}
export function quarterReturns(points:{date:string;close:number}[],now=new Date()){
 const current=now.getUTCFullYear()*4+Math.floor(now.getUTCMonth()/3);
 const ends=new Map<number,number>();for(const p of [...points].sort((a,b)=>a.date.localeCompare(b.date))){const d=new Date(p.date);if(!Number.isFinite(d.getTime())||!Number.isFinite(p.close)||p.close<=0)continue;const q=d.getUTCFullYear()*4+Math.floor(d.getUTCMonth()/3);if(q<current)ends.set(q,p.close)}
 return Array.from({length:8},(_,i)=>{const q=current-8+i,previous=ends.get(q-1),close=ends.get(q);return {quarter:`${Math.floor(q/4)} Q${q%4+1}`,value:previous&&close?((close/previous)-1)*100:null}});
}
