import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRONTEND_URL =
  process.env.FRONTEND_APP_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_APP_URL ??
  "http://localhost:5173";

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

type ProbeResult = {
  connected: boolean;
  status: number | null;
  latencyMs: number | null;
};

async function probe(url: string): Promise<ProbeResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    return {
      connected: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      connected: false,
      status: null,
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const [frontendProbe, backendProbe] = await Promise.all([
    probe(FRONTEND_URL),
    probe(`${BACKEND_URL}/api/health`),
  ]);

  let backendTimestamp: number | null = null;

  if (backendProbe.connected) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { timestamp?: number };
        backendTimestamp = typeof data.timestamp === "number" ? data.timestamp : null;
      }
    } catch {
      backendTimestamp = null;
    }
  }

  return NextResponse.json({
    frontend: {
      url: FRONTEND_URL,
      ...frontendProbe,
    },
    backend: {
      url: BACKEND_URL,
      ...backendProbe,
    },
    backendTimestamp,
  });
}
