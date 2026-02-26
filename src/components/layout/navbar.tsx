"use client";

/**
 * Gridiron Intel Navigation Bar
 *
 * Features:
 * - Logo with brand name
 * - Desktop navigation with all major sections
 * - Mobile hamburger menu with full navigation
 * - Active route indicator (teal underline)
 * - Smooth animations with Framer Motion
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, TrendingUp, BarChart3, Shield, Trophy, Zap, GitCompare, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navSections = [
  {
    label: "Rankings",
    href: "/",
    icon: TrendingUp,
  },
  {
    label: "Teams",
    href: "/teams",
    icon: Shield,
  },
  {
    label: "Conferences",
    href: "/conferences",
    icon: BarChart3,
  },
  {
    label: "Chaos",
    href: "/chaos",
    icon: Zap,
  },
  {
    label: "Matchup",
    href: "/matchup",
    icon: GitCompare,
  },
  {
    label: "More",
    href: "#",
    icon: Settings,
    children: [
      { label: "Predictions", href: "/predictions" },
      { label: "Methodology", href: "/methodology" },
      { label: "Pulse", href: "/pulse" },
      { label: "The Lab", href: "/lab" },
      { label: "What If", href: "/whatif" },
      { label: "Gameday", href: "/gameday" },
      { label: "Coaches", href: "/coaches" },
      { label: "Gauntlet", href: "/gauntlet" },
      { label: "Awards", href: "/awards" },
      { label: "Rivalries", href: "/rivalries" },
      { label: "Roster", href: "/roster" },
      { label: "Programs", href: "/programs" },
      { label: "The Stack", href: "/stack" },
    ],
  },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-bg-elevated bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <span className="font-display text-xl font-bold text-text-primary group-hover:text-accent-teal transition-colors">
                GRIDIRON
              </span>
              <span className="font-display text-xl font-bold text-accent-teal">
                INTEL
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-bg-elevated mx-1" />
            <span className="hidden sm:block text-xs text-text-muted font-mono">
              GridRank
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navSections.map((section) => {
              const Icon = section.icon;
              const hasChildren = section.children && section.children.length > 0;
              const active = isActive(section.href);

              if (hasChildren) {
                return (
                  <div
                    key={section.label}
                    className="relative"
                    onMouseEnter={() => setMoreDropdownOpen(true)}
                    onMouseLeave={() => setMoreDropdownOpen(false)}
                  >
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        active
                          ? "text-accent-teal"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {moreDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-1 w-48 rounded-md bg-bg-card border border-bg-elevated shadow-xl overflow-hidden"
                        >
                          <div className="py-1">
                            {section.children?.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "block px-4 py-2 text-sm transition-colors",
                                  isActive(child.href)
                                    ? "text-accent-teal bg-accent-teal/5"
                                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
                                )}
                                onClick={() => setMoreDropdownOpen(false)}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                    active
                      ? "text-accent-teal"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                  {active && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-teal"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden border-t border-bg-elevated bg-bg-card"
          >
            <div className="px-4 py-4 space-y-1">
              {navSections.map((section) => {
                const Icon = section.icon;
                const hasChildren = section.children && section.children.length > 0;
                const active = isActive(section.href);

                if (hasChildren) {
                  return (
                    <div key={section.label} className="space-y-1">
                      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted">
                        <Icon className="w-4 h-4" />
                        {section.label}
                      </div>
                      <div className="pl-6 space-y-1">
                        {section.children?.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block px-3 py-2 rounded-md text-sm transition-colors",
                              isActive(child.href)
                                ? "text-accent-teal bg-accent-teal/5"
                                : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "text-accent-teal bg-accent-teal/5"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
