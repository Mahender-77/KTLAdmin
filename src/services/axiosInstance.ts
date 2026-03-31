import axios from "axios";

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
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
