// Cliente de los endpoints que agrega vite-plugin-graph-editor.ts sobre
// el propio dev server (Fase 2 de UI_PLAN.md). Solo funcionan corriendo
// `pnpm run dev` — no existen en un build de produccion.

export class ApiError extends Error {}

async function requestJson<T>(url: string, method: "POST" | "DELETE", body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(message);
  }
  return data as T;
}

export function createComponent(name: string): Promise<{ id: string; filePath: string }> {
  return requestJson("/api/components", "POST", { name });
}

interface ConnectionParams {
  fromFilePath: string;
  toFilePath: string;
  toName: string;
}

export function connectComponents(params: ConnectionParams): Promise<{ ok: true }> {
  return requestJson("/api/connections", "POST", params);
}

export function disconnectComponents(params: ConnectionParams): Promise<{ ok: true }> {
  return requestJson("/api/connections", "DELETE", params);
}
