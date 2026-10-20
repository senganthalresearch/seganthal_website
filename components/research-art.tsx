import { useId } from "react";
import { BarChart3, ChartNoAxesCombined, ChartCandlestick, BriefcaseBusiness, Flame, Newspaper, Handshake, Landmark, Blocks, Lightbulb, Rocket, UsersRound, Store, GraduationCap, Radar, ScanSearch, SlidersHorizontal, Combine, ChartSpline, Route, BadgeCheck, Orbit, ChartNetwork, ChartArea, ContactRound, Layers, Files, Building2, ArrowLeftRight, SearchCheck, BookmarkCheck, Wallet, MessagesSquare, FileUp, HeartHandshake, ShieldCheck, Sprout, PackageCheck, AudioLines } from "lucide-react";

/** Distinct illustrated symbols for each research destination. */
const iconDesigns: Record<string, [typeof BarChart3, string, string]> = {
  "Market Home": [ChartNoAxesCombined,"#39b7ff","#2262de"], Indices: [ChartCandlestick,"#5996ff","#4b47d5"],
  "Investment Cases": [BriefcaseBusiness,"#b5a1ff","#7150d4"], "Trending Stocks": [Flame,"#ffbd71","#f16c56"],
  "News & Updates": [Newspaper,"#55c9e2","#2583bf"], Deals: [Handshake,"#e7ad66","#b97029"],
  "FII / DII Activity": [Landmark,"#7bc6b8","#208879"], Sectors: [Blocks,"#75b1ff","#5362c9"],
  "Research Insights": [Lightbulb,"#ffd777","#e59821"], IPO: [Rocket,"#d59aff","#8c55cd"],
  Investors: [UsersRound,"#5dc9e8","#2978b7"], "SME Zone": [Store,"#66d4b9","#259578"], Learn: [GraduationCap,"#a3a6ff","#6164cd"],
  "Analytics Home": [Radar,"#9aa3ff","#6b53d1"], Scans: [ScanSearch,"#51cabb","#1b958a"],
  "Custom Scans": [SlidersHorizontal,"#b39bf7","#7753cb"], "Combination Scans": [Combine,"#edb568","#bf842f"],
  "Chart Patterns": [ChartSpline,"#8cc1f3","#4872c9"], "Trading Strategies": [Route,"#75c9ba","#30867d"],
  "Fundamental Scores": [BadgeCheck,"#eda1c5","#b45c96"], "Sector Rotation": [Orbit,"#72c5eb","#368ab5"],
  "Market Breadth": [ChartNetwork,"#8fcdb2","#3c9876"], "Index Analytics": [ChartArea,"#b1aff7","#7671d0"],
  "Investor Portfolios": [ContactRound,"#7fbbf5","#3874bd"], "Investment Themes": [Layers,"#d6a5ef","#955bbc"],
  "Company Filings": [Files,"#95b0e8","#4c73b8"], "Business Houses": [Building2,"#e5bc80","#b28140"],
  "F&O Zone": [ArrowLeftRight,"#b3a7ef","#7360b5"], "Stock Analyzer": [SearchCheck,"#6ab7ef","#3674bd"],
  "My Watchlists": [BookmarkCheck,"#f3b77c","#d88443"], "My Portfolio": [Wallet,"#78c7bc","#288f82"],
  "Team Chat": [MessagesSquare,"#b1a2f2","#7960c6"], "PDF Upload": [FileUp,"#f4a29f","#c36166"],
  "About Us": [HeartHandshake,"#e6a4d8","#a75d9d"], Admin: [ShieldCheck,"#9aaeca","#566e94"],
  "Fund Explorer": [Sprout,"#9acd99","#4f9358"], breakout: [ChartCandlestick,"#a7d875","#639c32"],
  delivery: [PackageCheck,"#7eaef1","#386fc7"], volume: [AudioLines,"#ca9bea","#8b51b5"],
  chart: [BarChart3,"#63c0ff","#2368d5"], scan: [ScanSearch,"#5bcdb6","#1f9788"], scans: [ScanSearch,"#5bcdb6","#1f9788"],
  news: [Newspaper,"#6ec0eb","#3a80b6"], community: [UsersRound,"#ac9cea","#7556b9"], portfolio: [Wallet,"#78c7bc","#288f82"]
};
export function ResearchIcon({kind="chart",size=30}:{kind?:string;size?:number}) {
  const id=useId().replaceAll(":","");
  const [Icon,light,dark]=iconDesigns[kind]||iconDesigns.chart;
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className="research-illustrated-icon">
    <defs><linearGradient id={id} x1="5" y1="3" x2="41" y2="46" gradientUnits="userSpaceOnUse"><stop stopColor={light}/><stop offset="1" stopColor={dark}/></linearGradient></defs>
    <ellipse cx="25" cy="44" rx="15" ry="2.5" fill={dark} opacity=".13"/>
    <rect x="5" y="4" width="38" height="37" rx="11" fill={dark} opacity=".18" transform="rotate(-8 24 24)"/>
    <rect x="5" y="3" width="38" height="37" rx="11" fill={`url(#${id})`}/>
    <path d="M15 4h17a10 10 0 0 1 9 7L7 28V14A10 10 0 0 1 15 4" fill="white" opacity=".12"/>
    <Icon x={12} y={9} width={24} height={24} color="white" strokeWidth={1.8}/>
    <circle cx="40" cy="37" r="5" fill="white"/><circle cx="40" cy="37" r="3" fill={light}/>
  </svg>;
}

export function PatternDrawing({ kind = 0 }: { kind?: number }) {
  const paths = ["5,60 20,15 30,34 44,25 54,38 68,29 84,40 96,64", "5,20 19,34 33,25 47,44 61,35 76,55 92,44", "4,64 23,12 42,55 62,12 82,60 97,70", "4,15 20,65 35,28 50,65 66,30 81,64 97,18"];
  return <svg viewBox="0 0 104 80" width="104" height="80" role="img" aria-label={['Bearish flag illustration','Falling channel illustration','Double top illustration','Triple bottom illustration'][kind%4]}><path d={kind%4===1?'M9 9 96 38 96 65 9 36Z':kind%4===0?'M28 24 84 31 84 46 28 39Z':''} fill={kind%4===1?'#cdbade':'#ffb9c2'} opacity=".65"/><polyline points={paths[kind%4]} stroke={kind%4===3?'#009e78':'#ee6778'} strokeWidth="1.7" fill="none"/></svg>;
}

export function ResearchIllustration() {
  return <svg viewBox="0 0 560 330" role="img" aria-label="Illustration of stock research with a price chart, company score and sector heatmap"><rect width="560" height="330" rx="18" fill="#eef6ff"/><circle cx="451" cy="85" r="92" fill="#d8eaff"/><circle cx="65" cy="281" r="108" fill="#e0edff"/><rect x="49" y="32" width="453" height="260" rx="12" fill="white" stroke="#c3d8f3"/><path d="M49 71h453" stroke="#e2eaf4"/><circle cx="69" cy="51" r="4" fill="#ffbe4b"/><circle cx="83" cy="51" r="4" fill="#5cbda4"/><circle cx="97" cy="51" r="4" fill="#6599e8"/><rect x="118" y="43" width="163" height="16" rx="4" fill="#eef3fa"/><text x="72" y="104" fill="#253b60" fontSize="13" fontWeight="600">Your research. A clearer perspective.</text><path d="M76 141h248M76 173h248M76 205h248M76 237h248" stroke="#e5edf6" strokeDasharray="4 4"/><path d="m76 223 20-12 19 6 20-36 20 10 20-30 20 8 20-26 20 13 20-35 20 7 30-27v144H76z" fill="#e3f4f1"/><path d="m76 223 20-12 19 6 20-36 20 10 20-30 20 8 20-26 20 13 20-35 20 7 30-27" stroke="#16a086" strokeWidth="3" fill="none"/><rect x="349" y="123" width="127" height="69" rx="8" fill="#f2f7ff"/><text x="365" y="146" fill="#78869a" fontSize="10">RESEARCH SCORE</text><text x="365" y="178" fill="#1355d1" fontSize="26" fontWeight="600">78<tspan fontSize="12" fill="#78869a"> / 100</tspan></text>{Array.from({length:12},(_,i)=><rect key={i} x={350+(i%4)*32} y={205+Math.floor(i/4)*19} width="28" height="15" rx="2" fill={['#51ba9c','#a4d699','#ffe278','#ffc980'][i%4]}/>)}<rect x="72" y="263" width="73" height="5" rx="2" fill="#cad9eb"/><rect x="157" y="263" width="49" height="5" rx="2" fill="#e0e8f3"/></svg>;
}
