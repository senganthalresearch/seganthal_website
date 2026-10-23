import type { Metadata } from "next";
import "./globals.css";
import "./design-system.css";
import "./research.css";
import "./email-access.css";
import "./public-pages.css";
import "./billing.css";
import { ThemeProvider } from "@/components/theme";
import { SITE_URL, privateRobots } from '@/lib/seo';
// Private by default; public pages replace robots metadata explicitly. No
// inherited canonical that would incorrectly point every route at the homepage.
export const metadata: Metadata = { metadataBase: new URL(SITE_URL), title: "Senganthal | Research Terminal", description: "Financial data and tools for independent stock research.", robots: privateRobots };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-theme="light" suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>; }

