/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns comprehensive system health status including:
 * - Database connectivity
 * - Redis cache connectivity
 * - CFBD API availability
 * - Memory usage
 * - Uptime
 *
 * Status codes:
 * - 200: All systems healthy
 * - 503: One or more systems degraded/unhealthy
 */

import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/db/redis";

interface HealthCheck {
  status: "ok" | "error" | "degraded";
  latency: number;
  message?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: string;
  environment: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    cfbd: HealthCheck;
    memory: HealthCheck;
  };
}

/**
 * Check database connectivity
 * Executes a simple count query to verify Prisma connection
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Math.round(performance.now() - start);
    return {
      status: "ok",
      latency,
      message: "Database connected",
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    return {
      status: "error",
      latency,
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

/**
 * Check Redis connectivity
 * Executes PING command to verify cache layer
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    await redis.ping();
    const latency = Math.round(performance.now() - start);
    return {
      status: "ok",
      latency,
      message: "Redis connected",
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    return {
      status: "error",
      latency,
      message: error instanceof Error ? error.message : "Redis connection failed",
    };
  }
}

/**
 * Check CFBD API availability
 * Verifies API key configuration and optional endpoint ping
 */
async function checkCFBD(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const apiKey = process.env.CFBD_API_KEY;
    if (!apiKey) {
      return {
        status: "error",
        latency: Math.round(performance.now() - start),
        message: "CFBD_API_KEY not configured",
      };
    }

    // Optional: Ping CFBD API to verify availability
    // This is optional to avoid unnecessary API calls during health checks
    const cfbdEnabled = process.env.CFBD_HEALTH_CHECK_ENABLED === "true";
    if (cfbdEnabled) {
      const response = await fetch("https://api.collegefootballdata.com/teams", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok && response.status !== 429) {
        return {
          status: "error",
          latency: Math.round(performance.now() - start),
          message: `CFBD API returned ${response.status}`,
        };
      }
    }

    const latency = Math.round(performance.now() - start);
    return {
      status: "ok",
      latency,
      message: "CFBD API configured",
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    return {
      status: "error",
      latency,
      message: error instanceof Error ? error.message : "CFBD API check failed",
    };
  }
}

/**
 * Check memory usage
 * Reports heap usage as percentage of limit
 */
function checkMemory(): HealthCheck {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let status: "ok" | "degraded" | "error" = "ok";
    if (heapUsedPercent > 90) status = "error";
    else if (heapUsedPercent > 75) status = "degraded";

    return {
      status,
      latency: 0,
      message: `Heap: ${Math.round(heapUsedPercent)}% (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB)`,
    };
  } catch (error) {
    return {
      status: "error",
      latency: 0,
      message: error instanceof Error ? error.message : "Memory check failed",
    };
  }
}

/**
 * Determine overall health status from individual checks
 */
function determineOverallStatus(
  checks: HealthResponse["checks"]
): "healthy" | "degraded" | "unhealthy" {
  const statuses = Object.values(checks).map((c) => c.status);

  // All critical checks must pass for "healthy"
  const criticalChecksFailed = [
    checks.database.status === "error",
    checks.redis.status === "error",
  ].some((v) => v);

  if (criticalChecksFailed) return "unhealthy";
  if (statuses.includes("error")) return "degraded";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

/**
 * Main health check handler
 */
export async function GET(): Promise<Response> {
  try {
    // Run all health checks in parallel
    const [database, redis_check, cfbd, memory] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkCFBD(),
      Promise.resolve(checkMemory()),
    ]);

    const checks = {
      database,
      redis: redis_check,
      cfbd,
      memory,
    };

    const status = determineOverallStatus(checks);
    const statusCode = status === "healthy" ? 200 : 503;

    const response: HealthResponse = {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      checks,
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const response = {
      status: "unhealthy" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      error: errorMessage,
    };

    return new Response(JSON.stringify(response), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}

/**
 * Optional: HEAD request support for lightweight monitoring
 * Returns just status code without body
 */
export async function HEAD(): Promise<Response> {
  try {
    // Quick database check only for HEAD requests
    await prisma.$queryRaw`SELECT 1`;

    return new Response(null, {
      status: 200,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  }
}
