"use client";

import { useEffect, useState } from "react";

/** Cliente tipado para el contrato HTTP del backend ORIVIA. */
const API_BASE_URL = (process.env.NEXT_PUBLIC_ORIVIA_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");
const ACCESS_TOKEN_KEY = "orivia.access_token.v1";
const REFRESH_TOKEN_KEY = "orivia.refresh_token.v1";

export type ApiUser = {
  user_id: string;
  full_name: string;
  email: string;
  account_status: string;
  roles?: string[];
  phone?: string | null;
  municipality?: string | null;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer" | string;
  expires_in: number;
  user: ApiUser;
};

export type InventoryRow = Record<string, string | number | boolean | null>;
export type MarginRow = Record<string, string | number | null>;
export type CatalogProduct = Record<string, string | number | boolean | null>;
export type ReportOverview = {
  inventory: InventoryRow[];
  alerts: InventoryRow[];
  orders: { order_count: number; revenue: number | string } | null;
};

export class OriviaApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "OriviaApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function readToken(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeTokens(response: Pick<AuthResponse, "access_token" | "refresh_token">) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
  } catch {
    // El acceso a datos públicos no debe romperse si el almacenamiento está bloqueado.
  }
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Cierre de sesión best-effort; no se registran secretos.
  }
}

export function hasApiSession() {
  return Boolean(readToken(ACCESS_TOKEN_KEY) || readToken(REFRESH_TOKEN_KEY));
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const body = payload as { message?: unknown; error?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  }
  return fallback;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: "La API devolvió una respuesta no válida." };
  }
}

async function refreshAccessToken() {
  const refreshToken = readToken(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: "omit",
    });
  } catch {
    return false;
  }
  const payload = await parseResponse(response);
  if (!response.ok || !payload || typeof payload !== "object") {
    clearAuthTokens();
    return false;
  }
  const tokens = payload as Partial<AuthResponse>;
  if (typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string") {
    clearAuthTokens();
    return false;
  }
  writeTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
  return true;
}

async function request<T>(path: string, init: RequestInit = {}, canRefresh = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const accessToken = readToken(ACCESS_TOKEN_KEY);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "omit" });
  } catch {
    throw new OriviaApiError("No se pudo conectar con el backend de ORIVIA.", 0, "NETWORK_ERROR");
  }
  if (response.status === 401 && canRefresh && (await refreshAccessToken())) return request<T>(path, init, false);

  const payload = await parseResponse(response);
  if (!response.ok) {
    const retryAfter = payload && typeof payload === "object" && "retry_after_seconds" in payload
      ? Number((payload as { retry_after_seconds?: unknown }).retry_after_seconds)
      : undefined;
    const code = payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
      ? (payload as { error: string }).error
      : undefined;
    throw new OriviaApiError(errorMessage(payload, `La API respondió ${response.status}.`), response.status, code,
      Number.isFinite(retryAfter) ? retryAfter : undefined);
  }
  return payload as T;
}

export async function login(email: string, password: string) {
  const response = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
  if (!response.access_token || !response.refresh_token || !response.user) {
    throw new OriviaApiError("La respuesta de autenticación está incompleta.", 502, "INVALID_AUTH_RESPONSE");
  }
  writeTokens(response);
  return response;
}

export async function getReportOverview() {
  const response = await request<{ data: ReportOverview }>("/reports/overview");
  return response.data;
}

export async function getMargins() {
  const response = await request<{ data: MarginRow[] }>("/accounting/margins");
  return response.data;
}

export async function getPublicProducts(query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  const response = await request<{ data: CatalogProduct[] }>(`/catalog/products${suffix}`);
  return response.data;
}

export async function getPublicTraceability(query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  const response = await request<{ data: InventoryRow[] }>(`/catalog/traceability${suffix}`);
  return response.data;
}

export async function syncIntegration(provider: string) {
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(provider)) throw new OriviaApiError("Proveedor inválido.", 400, "VALIDATION_ERROR");
  const response = await request<{ data: Record<string, unknown> }>(`/integrations/${encodeURIComponent(provider)}/sync`, { method: "POST" });
  return response.data;
}

export function useKevinOverview(enabled: boolean) {
  const [state, setState] = useState<{ loading: boolean; data: ReportOverview | null; margins: MarginRow[]; error: string | null }>({
    loading: enabled,
    data: null,
    margins: [],
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    Promise.all([getReportOverview(), getMargins()])
      .then(([data, margins]) => {
        if (active) setState({ loading: false, data, margins, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ loading: false, data: null, margins: [], error: error instanceof Error ? error.message : "No se pudo leer el backend." });
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}
