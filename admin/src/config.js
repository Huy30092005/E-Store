const rawBackendUrl = import.meta.env.VITE_BACKEND_URL;

export const backendUrl =
  rawBackendUrl?.trim().replace(/^['"]|['"]$/g, "") || "http://localhost:4000";
export const currency = "$";
