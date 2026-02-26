import { useState } from "react";
import type { ReactNode } from "react";
import axiosInstance from "../services/axiosInstance";
import { AdminAuthContext } from "./adminAuth.context";

interface Props {
  children: ReactNode;
}

export const AdminAuthProvider = ({ children }: Props) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("adminToken")
  );

  const login = async (email: string, password: string) => {
    const res = await axiosInstance.post(
      "/api/auth/login",
      { email: email.trim(), password },
      { headers: { "Content-Type": "application/json" } }
    );

    const token = res.data?.accessToken;
    if (!token) throw new Error("No token received");
    localStorage.setItem("adminToken", token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider value={{ login, logout, isAuthenticated }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
