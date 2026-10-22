import type { Metadata } from "next";
import "./globals.css";
import "./design-system.css";
import "./research.css";
import "./email-access.css";
import "./public-pages.css";
import { ThemeProvider } from "@/components/theme";
export const metadata: Metadata = { title: "Senganthal | Research Terminal", description: "செங்காந்தள் முதலீட்டுக் குடும்பம் - a private research workspace for your investment team.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-theme="light" suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>; }

