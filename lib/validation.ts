import { z } from "zod";
export const symbolSchema = z.string().trim().toUpperCase().min(1).max(24).regex(/^[A-Z0-9&^][A-Z0-9&.^=-]*$/);
export const watchSchema = z.object({ symbol: symbolSchema, name: z.string().trim().min(1).max(160), group: z.string().trim().min(1).max(50).default("General") });
export const reportSchema = z.object({ symbol: symbolSchema, period: z.iso.date(), revenue: z.number().finite().nullable(), netProfit: z.number().finite().nullable(), operatingCashFlow: z.number().finite().nullable(), totalDebt: z.number().finite().nonnegative().nullable(), equity: z.number().finite().nullable(), notes: z.string().max(3000).default("") });

