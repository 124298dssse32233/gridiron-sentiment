import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, Courier_Prime } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * Gridiron Intel Root Layout
 *
 * Font loading with proper display strategy
 */

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: ["400"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  variable: "--font-courier-prime",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Gridiron Intel — Every Team. One List. College Football Rankings.",
  description:
    "The only college football analytics platform that ranks every team in America — FBS through NAIA — on one unified list. GridRank, Chaos Index, Coach Intelligence, and more.",
  keywords: [
    "college football",
    "rankings",
    "FBS",
    "FCS",
    "analytics",
    "GridRank",
    "Chaos Index",
    "statistics",
    "predictions",
  ],
  authors: [{ name: "Gridiron Intel" }],
  openGraph: {
    title: "Gridiron Intel — Every Team. One List.",
    description:
      "The definitive college football analytics platform. Every team in America, ranked on one unified list.",
    type: "website",
    url: "https://gridironintel.com",
    siteName: "Gridiron Intel",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gridiron Intel — Every Team. One List.",
    description:
      "The definitive college football analytics platform. Every team in America, ranked on one unified list.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSerif.variable} ${dmSans.variable} ${courierPrime.variable} font-body bg-bg-primary text-text-primary min-h-screen antialiased`}
      >
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
