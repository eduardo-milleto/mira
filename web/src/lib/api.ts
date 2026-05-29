const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // CSRF e validado por Origin no backend; o cookie de sessao vai via credentials:include
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const body = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body && (body as { error?: string }).error) || "Algo deu errado";
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
};
