import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://192.168.88.14:5000",
  // baseURL: "http://localhost:5000",
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
