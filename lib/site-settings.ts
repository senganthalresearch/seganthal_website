import { z } from 'zod';
export const roleSchema = z.enum(['admin', 'full', 'standard', 'viewer', 'member']);
export const permissionsSchema = z.object({ analyze:z.boolean().optional(),watchlist:z.boolean().optional(),chat:z.boolean().optional(),reports:z.boolean().optional(),swing:z.boolean().optional(),export:z.boolean().optional(),aboutEdit:z.boolean().optional() });
export const memberSchema = z.object({email:z.string().trim().toLowerCase().pipe(z.email()),name:z.string().trim().max(100).default(''),role:roleSchema,active:z.boolean(),permissions:permissionsSchema.default({})});
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const image = z.string().max(750000).refine(v=>v==='' || v==='/founder-reference.jpg' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),'Choose a PNG, JPEG or WebP image under 500 KB.');
export const aboutSchema = z.object({founderName:z.string().trim().min(1).max(120),founderTitle:z.string().max(120),photo:image,tagline:z.string().max(250),story:z.string().max(6000),journey:z.string().max(3000),members:z.string().max(30),founded:z.string().max(20),programs:z.string().max(30),offers:z.string().max(3000),quotes:z.string().max(6000),closing:z.string().max(300)});
export const bannerSchema = z.object({enabled:z.boolean(),text:z.string().trim().max(3000),colorStart:color,colorEnd:color,textColor:color,speed:z.number().int().min(10).max(120),scroll:z.boolean(),startsAt:z.string().refine(v=>!v||Number.isFinite(Date.parse(v))).default(''),endsAt:z.string().refine(v=>!v||Number.isFinite(Date.parse(v))).default('')}).refine(v=>!v.startsAt||!v.endsAt||Date.parse(v.endsAt)>Date.parse(v.startsAt),'Banner end must be after its start.');
export type AboutContent = z.infer<typeof aboutSchema>;
export type BannerContent = z.infer<typeof bannerSchema>;
export type SiteSettings = {about:AboutContent;banner:BannerContent;updatedAt?:string};
export const defaultSettings:SiteSettings = {
 about:{founderName:'Jayamohan Sundararaj',founderTitle:'Founder & Chief Mentor',photo:'/founder-reference.jpg',tagline:'எல்லோருக்கும் எல்லாமும் ♦ ♦ ♦',story:'',journey:'2025 | 2030 is our Target',members:'1000 +',founded:'2025',programs:'7',offers:'Fundamental Analysis Classes\nSwing Trading Classes\nUS Market Classes\nPortfolio Arrangement\nMedical Insurance Advisory\nTerm Insurance Advisory\nRetirement Planning Advisory\nDirect Classes in Future',quotes:'📈 பங்குச்சந்தை பணக்காரர்களுக்கான இடம் அல்ல… புத்திசாலிகளுக்கான இடம்! 🧠 🤝 வாருங்கள்… சேர்ந்து கற்போம், முதலீடு செய்வோம், சேர்ந்து வளர்வோம்! ♦ ♦ ♦',closing:'Join our family and grow with us.'},
 banner:{enabled:true,text:'சேர்ந்து கற்போம், முதலீடு செய்வோம், சேர்ந்து வளர்வோம்!',colorStart:'#0f766e',colorEnd:'#4338ca',textColor:'#ffffff',speed:35,scroll:false,startsAt:'',endsAt:''}
};
export function bannerVisible(banner:BannerContent,now=Date.now()){return banner.enabled&&Boolean(banner.text)&&(!banner.startsAt||Date.parse(banner.startsAt)<=now)&&(!banner.endsAt||Date.parse(banner.endsAt)>now);}
