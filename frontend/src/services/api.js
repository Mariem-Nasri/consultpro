const API_ROOT = `${import.meta.env.VITE_API_URL || ""}/api`;
export const TOKEN_KEY = "consultpro-token";

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.message || "Une erreur est survenue.");
  }
  return response.status === 204 ? null : response.json();
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
