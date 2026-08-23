import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;
export const TOKEN_KEY = "stride_auth_token";

async function authHeader(): Promise<Record<string, string>> {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ApiError = { status: number; message: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message =
      (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw { status: res.status, message } as ApiError;
  }
  return data as T;
}

// Resolve an image url — external http(s) urls pass through, storage paths get the backend prefix.
export function resolveImage(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: any) =>
    request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(p: string, body?: any) =>
    request<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

// Multipart image upload. Handles web (blob) vs native (uri) body shapes.
export async function uploadImage(uri: string): Promise<{ url: string; path: string }> {
  const form = new FormData();
  const name = `photo_${Date.now()}.jpg`;
  // @ts-ignore Platform check without importing Platform to keep this file lean
  const isWeb = typeof document !== "undefined";
  if (isWeb) {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    // @ts-ignore native FormData file shape
    form.append("file", { uri, name, type: "image/jpeg" });
  }
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { ...(await authHeader()) }, // never set Content-Type for multipart
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    throw { status: res.status, message: t || "Upload failed" } as ApiError;
  }
  return res.json();
}
