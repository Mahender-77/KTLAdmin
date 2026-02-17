import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://192.168.88.19:5000",
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
