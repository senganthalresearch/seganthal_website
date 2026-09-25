import type { Metadata } from "next";
import "./globals.css";
import "./market-theme.css";
export const metadata: Metadata = { title: "Senganthal | Research Terminal", description: "செங்காந்தள் முதலீட்டுக் குடும்பம் - a private research workspace for your investment team.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-theme="dark"><body>{children}</body></html>; }

