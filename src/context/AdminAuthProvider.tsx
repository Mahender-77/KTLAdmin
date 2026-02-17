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
    const res = await axiosInstance.post("/api/auth/login", {
      email,
      password,
    });

    localStorage.setItem("adminToken", res.data.accessToken);
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
