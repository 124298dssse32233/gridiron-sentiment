/**
 * Bump Chart Component (D3-based)
 *
 * Shows how multiple teams' rankings change over weeks.
 * This is the signature visualization for ranking trends.
 *
 * - Each team is a smooth curve (cardinal interpolation)
 * - Team colors: 2.5px strokes
 * - Y-axis inverted: rank 1 at top
 * - On hover: dim all other lines to 20% opacity, highlight hovered team
 * - Circles at each data point (hidden until hover)
 * - Labels on right side: team name + current rank
 * - Animate lines on mount (stroke-dasharray)
 * - D3 for path generation, React ref for DOM manipulation
 */

"use client";

import {
  useRef,
  useEffect,
  useState,
  useMemo,
  MouseEvent as ReactMouseEvent,
} from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils/cn";
import { CHART_COLORS } from "./constants";

export interface BumpChartTeam {
  team: string;
  color: string;
  ranks: Array<{
    week: number;
    rank: number;
  }>;
}

export interface BumpChartProps {
  data: BumpChartTeam[];
  weeks: number[]; // [1, 2, 3, ..., 14]
  maxRank?: number; // Default 25 (invert y-axis)
  height?: number; // Default 400
  interactive?: boolean; // Default true
  className?: string;
  showLabels?: boolean; // Default true
}

export function BumpChart({
  data,
  weeks,
  maxRank = 25,
  height = 400,
  interactive = true,
  className,
  showLabels = true,
}: BumpChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  const margin = { top: 20, right: 200, bottom: 30, left: 50 };
  const width = 1000; // Fixed width for SVG

  // Filter and sort data
  const filteredData = useMemo(
    () =>
      data.filter((team) =>
        weeks.every((week) => team.ranks.some((r) => r.week === week))
      ),
    [data, weeks]
  );

  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0 || weeks.length === 0) {
      return;
    }

    // Set up scales
    const xScale = d3
      .scaleLinear<number, number>()
      .domain([weeks[0]!, weeks[weeks.length - 1]!])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear<number, number>()
      .domain([1, maxRank])
      .range([height - margin.bottom, margin.top]); // Inverted range: rank 1 at top

    // Create line generator
    const lineGen = d3
      .line<{ week: number; rank: number }>()
      .x((d) => xScale(d.week) ?? 0)
      .y((d) => yScale(d.rank) ?? 0)
      .curve(d3.curveCardinal);

    // Clear existing content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Add background
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent");

    // Add grid lines (Y-axis ranks)
    const gridGroup = svg.append("g").attr("class", "grid");

    for (let rank = 1; rank <= maxRank; rank += 5) {
      const y = yScale(rank) ?? 0;
      gridGroup
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", String(y))
        .attr("y2", String(y))
        .attr("stroke", CHART_COLORS.grid)
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", "0.5");

      gridGroup
        .append("text")
        .attr("x", margin.left - 10)
        .attr("y", String(y))
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "12px")
        .attr("fill", CHART_COLORS.axis)
        .text(`${rank}`);
    }

    // Add week labels (X-axis)
    const xAxisGroup = svg.append("g").attr("class", "x-axis");

    weeks.forEach((week) => {
      const x = xScale(week) ?? 0;
      xAxisGroup
        .append("text")
        .attr("x", String(x))
        .attr("y", String(height - margin.bottom + 20))
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", CHART_COLORS.axis)
        .text(`W${week}`);
    });

    // Add lines for each team
    const linesGroup = svg.append("g").attr("class", "lines");

    filteredData.forEach((team) => {
      const path = linesGroup
        .append("path")
        .attr("d", lineGen(team.ranks))
        .attr("stroke", team.color)
        .attr("stroke-width", 2.5)
        .attr("fill", "none")
        .attr("class", `team-line team-${team.team.replace(/\s+/g, "-")}`)
        .style("opacity", 1)
        .style("transition", "opacity 0.2s ease");

      // Stroke animation on mount
      const pathLength = (path.node() as SVGPathElement)?.getTotalLength?.() || 0;
      path
        .attr("stroke-dasharray", pathLength)
        .attr("stroke-dashoffset", pathLength)
        .transition()
        .duration(800)
        .ease(d3.easeQuadInOut)
        .attr("stroke-dashoffset", 0);

      if (interactive) {
        path.on("mouseenter", () => setHoveredTeam(team.team));
        path.on("mouseleave", () => setHoveredTeam(null));
      }
    });

    // Add dots for data points
    const dotsGroup = svg.append("g").attr("class", "dots");

    filteredData.forEach((team) => {
      team.ranks.forEach((rankData) => {
        const cx = xScale(rankData.week) ?? 0;
        const cy = yScale(rankData.rank) ?? 0;
        const dot = dotsGroup
          .append("circle")
          .attr("cx", String(cx))
          .attr("cy", String(cy))
          .attr("r", "0")
          .attr("fill", team.color)
          .attr("class", `team-${team.team.replace(/\s+/g, "-")}`)
          .style("opacity", "0");

        // Grow dots on hover
        if (interactive) {
          svg
            .selectAll(`.team-${team.team.replace(/\s+/g, "-")}`)
            .on("mouseenter", () => {
              dot.transition().duration(150).attr("r", "5").style("opacity", "1");
            })
            .on("mouseleave", () => {
              dot.transition().duration(150).attr("r", "0").style("opacity", "0");
            });
        }
      });
    });

    // Add labels on right side (if enabled)
    if (showLabels) {
      const labelsGroup = svg.append("g").attr("class", "labels");

      filteredData.forEach((team) => {
        const lastRank = team.ranks[team.ranks.length - 1];
        if (!lastRank) return;

        const x = width - margin.right + 10;
        const y = (yScale(lastRank.rank) ?? 0);

        labelsGroup
          .append("text")
          .attr("x", String(x))
          .attr("y", String(y - 6))
          .attr("font-size", "13px")
          .attr("font-weight", "600")
          .attr("fill", CHART_COLORS.text.primary)
          .text(team.team)
          .style("opacity", String(hoveredTeam === null || hoveredTeam === team.team ? 1 : 0.3));

        labelsGroup
          .append("text")
          .attr("x", String(x))
          .attr("y", String(y + 8))
          .attr("font-size", "11px")
          .attr("fill", CHART_COLORS.text.secondary)
          .attr("font-family", "'Courier Prime', monospace")
          .text(`#${lastRank.rank}`)
          .style("opacity", String(hoveredTeam === null || hoveredTeam === team.team ? 1 : 0.3));
      });
    }

    // Update line opacity on hover
    if (interactive) {
      svg.selectAll(".team-line").style("opacity", (_, i: number) => {
        if (!hoveredTeam) return 1;
        const team = filteredData[i];
        return team.team === hoveredTeam ? 1 : 0.2;
      });
    }
  }, [
    filteredData,
    weeks,
    maxRank,
    height,
    width,
    margin,
    interactive,
    showLabels,
    hoveredTeam,
  ]);

  return (
    <div
      className={cn("w-full rounded-lg bg-bg-card p-4 overflow-x-auto", className)}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ minWidth: "100%", cursor: interactive ? "pointer" : "default" }}
      />
    </div>
  );
}
