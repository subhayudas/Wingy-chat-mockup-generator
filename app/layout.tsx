import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wingy Studio — UGC Chat Video Generator",
  description: "Write Wingy-voiced conversations and export perfectly paced vertical WhatsApp videos.",
  metadataBase: new URL("https://wingy-ugc-studio.priyansha914729.chatgpt.site"),
  openGraph: {
    title: "Wingy Studio — UGC Chat Video Generator",
    description: "Turn a dating take into a chat worth watching.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wingy Studio — UGC Chat Video Generator",
    description: "Turn a dating take into a chat worth watching.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
