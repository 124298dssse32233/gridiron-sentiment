/**
 * Team Selector Component
 *
 * Dropdown to select a team for matchup simulation
 */

"use client";

import { useState, useEffect } from "react";
import { TeamLogo } from "@/components/ui/team-logo";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, Search, X } from "lucide-react";

interface Team {
  id: number;
  name: string;
  abbreviation: string | null;
  slug: string;
  logoUrl: string | null;
  level: { name: string } | null;
}

interface TeamSelectorProps {
  label: string;
  selectedTeam: Team | null;
  onTeamSelect: (team: Team) => void;
  onClear: () => void;
  excludeTeam?: Team | null;
}

export function TeamSelector({
  label,
  selectedTeam,
  onTeamSelect,
  onClear,
  excludeTeam,
}: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && teams.length === 0) {
      fetchTeams();
    }
  }, [isOpen]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teams?limit=200");
      const result = await response.json();
      if (result.success) {
        setTeams(result.data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(search.toLowerCase()) ||
      team.abbreviation?.toLowerCase().includes(search.toLowerCase());
    const notExcluded = !excludeTeam || team.id !== excludeTeam.id;
    return matchesSearch && notExcluded;
  });

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>

      {/* Selected Team Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-3 bg-bg-elevated border border-bg-card rounded-md text-left transition-colors hover:border-accent-teal/30 focus:outline-none focus:ring-2 focus:ring-accent-teal/50",
          selectedTeam && "border-accent-teal/30"
        )}
      >
        {selectedTeam ? (
          <div className="flex items-center gap-3">
            <TeamLogo
              team={selectedTeam.name}
              abbreviation={selectedTeam.abbreviation}
              logoUrl={selectedTeam.logoUrl}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">
                {selectedTeam.name}
              </p>
              <p className="text-xs text-text-muted">
                {selectedTeam.level?.name} • {selectedTeam.abbreviation}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-text-muted">Select a team...</span>
        )}
        <div className="flex items-center gap-2">
          {selectedTeam && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 hover:text-accent-negative text-text-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-muted transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute z-20 w-full mt-2 bg-bg-card border border-bg-elevated rounded-md shadow-lg max-h-80 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-bg-elevated">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search teams..."
                  className="w-full pl-9 pr-3 py-2 bg-bg-elevated border border-bg-card rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
                />
              </div>
            </div>

            {/* Team List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-text-muted text-sm">
                  Loading teams...
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="p-4 text-center text-text-muted text-sm">
                  No teams found
                </div>
              ) : (
                filteredTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      onTeamSelect(team);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
                  >
                    <TeamLogo
                      team={team.name}
                      abbreviation={team.abbreviation}
                      logoUrl={team.logoUrl}
                      size="sm"
                    />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {team.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {team.level?.name} • {team.abbreviation}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
