/**
 * Gridiron Intel Footer
 *
 * Features:
 * - Site navigation links organized by category
 * - Social media links
 * - Legal links (Terms, Privacy)
 * - Copyright notice
 * - Responsive design
 */

import Link from "next/link";
import { Github, Twitter, Mail } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const footerSections = [
  {
    title: "Core Features",
    links: [
      { label: "Rankings", href: "/" },
      { label: "Teams", href: "/teams" },
      { label: "Conferences", href: "/conferences" },
      { label: "Program Rankings", href: "/programs" },
      { label: "Predictions", href: "/predictions" },
      { label: "Methodology", href: "/methodology" },
    ],
  },
  {
    title: "Analytics",
    links: [
      { label: "Chaos Index", href: "/chaos" },
      { label: "The Lab", href: "/lab" },
      { label: "Matchup Machine", href: "/matchup" },
      { label: "What If Engine", href: "/whatif" },
      { label: "Coach Intelligence", href: "/coaches" },
      { label: "The Gauntlet", href: "/gauntlet" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Gameday Dashboard", href: "/gameday" },
      { label: "Awards Tracker", href: "/awards" },
      { label: "Rivalries", href: "/rivalries" },
      { label: "Roster Intelligence", href: "/roster" },
      { label: "Fan Pulse", href: "/pulse" },
      { label: "The Stack", href: "/stack" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "About", href: "/about" },
      { label: "API", href: "/api" },
      { label: "Data Sources", href: "/sources" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

const socialLinks = [
  {
    name: "Twitter",
    href: "https://twitter.com/gridironintel",
    icon: Twitter,
  },
  {
    name: "GitHub",
    href: "https://github.com/gridironintel",
    icon: Github,
  },
  {
    name: "Email",
    href: "mailto:hello@gridironintel.com",
    icon: Mail,
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-bg-elevated bg-bg-secondary">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {/* Brand section - spans 2 columns on larger screens */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="font-display text-xl font-bold text-text-primary">
                GRIDIRON
              </span>
              <span className="font-display text-xl font-bold text-accent-teal ml-1">
                INTEL
              </span>
            </Link>
            <p className="text-sm text-text-secondary max-w-xs mb-4">
              Every Team. One List. The definitive college football analytics platform ranking all levels on one unified list.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      "bg-bg-card border border-bg-elevated",
                      "text-text-secondary hover:text-accent-teal",
                      "hover:border-accent-teal/30 hover:bg-accent-teal/5",
                      "transition-all duration-200"
                    )}
                    aria-label={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="col-span-1">
              <h3 className="font-medium text-text-primary text-sm mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-accent-teal transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-bg-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted">
              © {currentYear} Gridiron Intel. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/privacy"
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-xs text-text-muted">
                Data provided by CollegeFootballData.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
