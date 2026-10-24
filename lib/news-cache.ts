/** Bounded, short-lived fallback for public news only, never account/payment data. */
export function createNewsFallback(maxEntries=100, maxAge=30*60*1000) {
  const entries=new Map<string,{at:number;data:unknown}>();
  return async function read<T>(key:string,fetcher:()=>Promise<T>):Promise<{data:T;stale:boolean}> {
    try {
      const data=await fetcher();
      if(!entries.has(key)&&entries.size>=maxEntries)entries.delete(entries.keys().next().value!);
      entries.set(key,{at:Date.now(),data});return {data,stale:false};
    }catch(error){
      const hit=entries.get(key);
      if(hit&&Date.now()-hit.at<=maxAge)return {data:hit.data as T,stale:true};
      entries.delete(key);throw error;
    }
  };
}
