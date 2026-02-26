/**
 * Methodology Page — How GridRank Works
 *
 * Two modes:
 * 1. Casual: Plain-English explanation for general fans
 * 2. Deep Dive: Full mathematical treatment for analytics nerds
 *
 * This is a server component — pure content, no database needed.
 */

import { Metadata } from "next";
import { MethodologyContent } from "./methodology-content";

export const metadata: Metadata = {
  title: "Methodology — How GridRank Works | Gridiron Intel",
  description:
    "The complete guide to GridRank: a Glicko-2 hybrid rating system that ranks every college football team in America — FBS, FCS, D2, D3, and NAIA — on one unified list.",
  openGraph: {
    title: "How GridRank Works | Gridiron Intel",
    description:
      "A Glicko-2 hybrid system ranking every team in college football. Learn about margin compression, garbage time filtering, dynamic home field advantage, and preseason priors.",
  },
};

export default function MethodologyPage() {
  return <MethodologyContent />;
}
