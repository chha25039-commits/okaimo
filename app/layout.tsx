import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const zenMaru = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-maru",
  display: "swap",
});

const shippori = Shippori_Mincho({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-shippori",
  display: "swap",
});

export const metadata: Metadata = {
  title: "おかいも",
  description: "バイト生活のための、やさしいお金の記録",
};

export const viewport: Viewport = {
  themeColor: "#f6f8f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${zenMaru.variable} ${shippori.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}