import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (!fromEnv) {
    throw new Error(
      "VITE_API_URL is not set. Copy admin/.env.example to admin/.env and set VITE_API_URL (no trailing slash)."
    );
  }
  return fromEnv.replace(/\/$/, "");
}

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

/** No Authorization / CSRF interceptors — used only for `POST /api/auth/refresh`. */
const refreshClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

type ConfigWithRetry = InternalAxiosRequestConfig & { _retryAfterRefresh?: boolean };

let sessionInvalidatedHandler: (() => void) | null = null;

/** Called when refresh fails or auth cannot be recovered (e.g. invalid refresh token). */
export function setSessionInvalidatedHandler(fn: (() => void) | null) {
  sessionInvalidatedHandler = fn;
}

function requestPath(config: InternalAxiosRequestConfig): string {
  const u = config.url ?? "";
  if (u.startsWith("http")) {
    try {
      return new URL(u).pathname;
    } catch {
      return u.split("?")[0];
    }
  }
  return u.split("?")[0];
}

function shouldSkipRefreshForUrl(path: string): boolean {
  return (
    path.endsWith("/api/auth/login") ||
    path.endsWith("/api/auth/register") ||
    path.endsWith("/api/auth/refresh") ||
    path.endsWith("/api/auth/logout")
  );
}

function clearStoredSession() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("adminOrganizationId");
  delete axiosInstance.defaults.headers.common["Authorization"];
}

// CSRF token (double-submit pattern). Server-side token issuance is expected to
// live at GET /api/auth/csrf-token. Since we only execute admin-side changes here,
// fetching is best-effort and will not block the app if the endpoint is missing.
let csrfToken: string | null = null;
let csrfFetchInFlight: Promise<string | null> | null = null;
let csrfFetchFailed = false;

function readCsrfTokenFromResponse(data: unknown): string | null {
  const d = data as Record<string, unknown> | null | undefined;
  const maybe =
    d?.csrfToken ??
    d?.token ??
    (d?.data as Record<string, unknown> | undefined)?.csrfToken ??
    (d?.data as Record<string, unknown> | undefined)?.token ??
    null;
  return typeof maybe === "string" ? maybe : null;
}

const csrfClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (csrfFetchFailed) return null;
  if (csrfFetchInFlight) return csrfFetchInFlight;

  csrfFetchInFlight = (async () => {
    try {
      const accessToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await csrfClient.get("/api/auth/csrf-token", { headers });

      if (res.status !== 200) {
        return null;
      }

      const token = readCsrfTokenFromResponse(res.data);
      csrfToken = token;
      return token;
    } catch {
      csrfFetchFailed = true;
      return null;
    } finally {
      csrfFetchInFlight = null;
    }
  })();

  return csrfFetchInFlight;
}

// Allows app bootstrap to try fetching the CSRF token early.
export async function initCsrfToken(): Promise<void> {
  csrfFetchFailed = false;
  csrfToken = null;
  await ensureCsrfToken();
}

function isAuthCsrfExcluded(method: string, url: string): boolean {
  if (method.toLowerCase() !== "post") return false;
  const path = url.split("?")[0];
  return (
    path.endsWith("/api/auth/login") ||
    path.endsWith("/api/auth/register") ||
    path.endsWith("/api/auth/refresh") ||
    path.endsWith("/api/auth/logout") ||
    path.endsWith("/api/auth/change-password")
  );
}

axiosInstance.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("adminToken");
  config.headers = config.headers ?? {};

  if (token) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const organizationId = localStorage.getItem("adminOrganizationId");
  if (organizationId) {
    (config.headers as Record<string, string>)["x-organization-id"] = organizationId;
  }

  const method = (config.method ?? "get").toLowerCase();
  const isMutating = ["post", "put", "patch", "delete"].includes(method);
  const path = (config.url ?? "").split("?")[0];

  if (isMutating && !isAuthCsrfExcluded(method, path)) {
    await ensureCsrfToken();
    if (csrfToken) {
      (config.headers as Record<string, string>)["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

async function performTokenRefresh(): Promise<string | null> {
  const rt = localStorage.getItem("adminRefreshToken");
  if (!rt) return null;

  try {
    const res = await refreshClient.post("/api/auth/refresh", { refreshToken: rt });
    const accessToken = res.data?.accessToken as string | undefined;
    const newRefresh = res.data?.refreshToken as string | undefined;
    if (!accessToken) return null;

    localStorage.setItem("adminToken", accessToken);
    if (newRefresh) localStorage.setItem("adminRefreshToken", newRefresh);
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    return accessToken;
  } catch {
    return null;
  }
}

function retryRequestWithToken(config: ConfigWithRetry, token: string) {
  config.headers = config.headers ?? {};
  (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  config._retryAfterRefresh = true;
  return axiosInstance(config);
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as ConfigWithRetry | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    if (original._retryAfterRefresh) {
      return Promise.reject(error);
    }

    const path = requestPath(original);
    if (shouldSkipRefreshForUrl(path)) {
      return Promise.reject(error);
    }

    if (!localStorage.getItem("adminRefreshToken")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshSubscribers.push((token) => {
          retryRequestWithToken(original, token).then(resolve).catch(reject);
        });
      });
    }

    isRefreshing = true;
    try {
      const token = await performTokenRefresh();
      if (!token) {
        refreshSubscribers = [];
        clearStoredSession();
        sessionInvalidatedHandler?.();
        return Promise.reject(error);
      }
      const queued = [...refreshSubscribers];
      refreshSubscribers = [];
      queued.forEach((cb) => cb(token));
      return retryRequestWithToken(original, token);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;
