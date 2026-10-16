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

export type ApiOrder = Record<string, unknown> & {
  id?: string;
  order_id?: string;
  created_by?: string;
  product?: string;
  quantity?: number;
  origin?: string;
  destination?: string;
  status?: string;
  created_at?: string;
};
export type ApiOrderEvent = Record<string, unknown> & {
  id?: string;
  event_hash?: string;
  type?: string;
  new_status?: string;
  previous_status?: string | null;
  occurred_at?: string;
};
export type ApiBlockchainReceipt = Record<string, unknown> & {
  event_hash?: string;
  status?: string;
  reference?: string;
  network?: string;
  transaction_id?: string | null;
  block_number?: number | null;
  chain_id?: number | null;
  contract_address?: string | null;
  verified?: boolean;
};
export type ApiOrderMutationResponse = { order: ApiOrder; blockchain?: ApiBlockchainReceipt };
export type ApiAuditVerification = { order_id?: string; verified?: boolean; event_count?: number };
export type ApiClusterActor = Record<string, unknown> & { id?: string; name?: string; type?: string };
export type ApiClusterNeed = Record<string, unknown> & { need_id?: string; title?: string };
export type ApiAiResult = Record<string, unknown>;

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

export async function getCurrentUser() {
  return request<{ user: ApiUser }>("/auth/me");
}

export async function listOrders() {
  const response = await request<{ orders?: ApiOrder[]; data?: ApiOrder[] } | ApiOrder[]>("/orders");
  return Array.isArray(response) ? response : response.orders ?? response.data ?? [];
}

export async function getOrder(orderId: string) {
  const response = await request<{ order?: ApiOrder } | ApiOrder>(`/orders/${encodeURIComponent(orderId)}`);
  return "order" in response && response.order ? response.order : response;
}

export async function createOrder(payload: { product: string; quantity: number; origin: string; destination: string }) {
  return request<ApiOrderMutationResponse>("/orders", { method: "POST", body: JSON.stringify(payload) });
}

export async function transitionOrder(orderId: string, status: string) {
  return request<ApiOrderMutationResponse>(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getOrderTimeline(orderId: string) {
  return request<{ events: ApiOrderEvent[] }>(`/orders/${encodeURIComponent(orderId)}/timeline`);
}

export async function getOrderAudit(orderId: string, verify = false) {
  return request<ApiAuditVerification & { audits?: Record<string, unknown>[] }>(`/audit/orders/${encodeURIComponent(orderId)}${verify ? "/verify" : ""}`);
}

export async function getPublicLot(lotId: string) {
  return request<Record<string, unknown>>(`/public/lots/${encodeURIComponent(lotId)}`);
}

export async function getLot(lotId: string) {
  return request<Record<string, unknown>>(`/lots/${encodeURIComponent(lotId)}`);
}

export async function getLotTimeline(lotId: string) {
  return request<Record<string, unknown>>(`/lots/${encodeURIComponent(lotId)}/timeline`);
}

export async function updateLotStatus(lotId: string, status: "PENDING" | "LIBERATED" | "BLOCKED", reason: string) {
  return request<Record<string, unknown>>(`/lots/${encodeURIComponent(lotId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}

export async function getPublicClusterActors() {
  const response = await request<{ actors: ApiClusterActor[] }>("/public/cluster/actors");
  return response.actors;
}

export async function getClusterActors() {
  const response = await request<{ actors: ApiClusterActor[] }>("/cluster/actors");
  return response.actors;
}

export async function getClusterActor(actorId: string, publicOnly = false) {
  return request<ApiClusterActor>(`${publicOnly ? "/public" : ""}/cluster/actors/${encodeURIComponent(actorId)}`);
}

export async function getClusterNeeds(publicOnly = false) {
  const response = await request<{ needs: ApiClusterNeed[] }>(`${publicOnly ? "/public" : ""}/cluster/needs`);
  return response.needs;
}

export async function getActorTrust(actorId: string) {
  return request<Record<string, unknown>>(`/cluster/actors/${encodeURIComponent(actorId)}/trust`);
}

export async function createClusterNeed(payload: { title: string; description: string; category: string; quantity: number; unit: string }) {
  return request<ApiClusterNeed>("/cluster/needs", { method: "POST", body: JSON.stringify(payload) });
}

export async function createClusterConnection(payload: { target_actor_id: string; need_id?: string; message: string }) {
  return request<Record<string, unknown>>("/cluster/connections", { method: "POST", body: JSON.stringify(payload) });
}

export async function getOrderAiSummary(orderId: string) {
  return request<ApiAiResult>(`/ai/orders/${encodeURIComponent(orderId)}/summary`, { method: "POST", body: JSON.stringify({}) });
}

export async function getOrderAiAudit(orderId: string) {
  return request<ApiAiResult>(`/ai/orders/${encodeURIComponent(orderId)}/audit`, { method: "POST", body: JSON.stringify({}) });
}

export async function getAiAnalytics(payload: Record<string, unknown> = {}) {
  return request<ApiAiResult>("/ai/analytics", { method: "POST", body: JSON.stringify(payload) });
}

export async function getBlockchainAnchor(eventHash: string) {
  const response = await request<{ anchor?: ApiBlockchainReceipt }>(`/blockchain/anchors/${encodeURIComponent(eventHash)}`);
  return response.anchor ?? {};
}

/** El backend recibe order_id y ancla el último evento íntegro del pedido. */
export async function createBlockchainAnchor(orderId: string) {
  return request<{ anchor: ApiBlockchainReceipt; idempotent?: boolean }>("/blockchain/anchors", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
  });
}

/** Solo ADMIN puede listar usuarios; nunca se usa en la landing pública. */
export async function listUsers(status?: "ACTIVE" | "BLOCKED" | "SUSPENDED") {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await request<{ data: ApiUser[] }>(`/users${suffix}`);
  return response.data;
}

export type RegistrationRole = { role: string; label: string };

/** Roles que el backend permite elegir al crear una cuenta (nunca administrativos). */
export async function getRegistrationRoles() {
  const response = await request<{ data: RegistrationRole[] }>("/auth/register/roles", {}, false);
  return response.data;
}

/** Crea la cuenta; la contraseña viaja solo en el cuerpo HTTPS y el backend guarda su hash. */
export async function register(payload: { full_name: string; email: string; password: string; password_confirmation: string; role: string }) {
  const response = await request<{ data: ApiUser }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }, false);
  return response.data;
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
