import { useState, useEffect, type ReactNode } from "react";
import axiosInstance from "../services/axiosInstance";
import { AdminAuthContext } from "./adminAuth.context";

interface Props {
  children: ReactNode;
}

export const AdminAuthProvider = ({ children }: Props) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role?: string;
    organizationId?: string | null;
    isSuperAdmin?: boolean;
  } | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [productFields, setProductFields] = useState<Record<string, boolean>>({});

  const applyAccessData = (payload: any) => {
    setUser(payload?.user ?? null);
    setModules(Array.isArray(payload?.organization?.modules) ? payload.organization.modules : []);
    setPermissions(Array.isArray(payload?.permissions) ? payload.permissions : []);
    setProductFields(payload?.productFields ?? {});
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setSessionLoading(false);
      return;
    }
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    axiosInstance
      .get("/api/auth/me")
      .then((res) => {
        if (res.data?.user?.role === "admin" || res.data?.user?.isSuperAdmin === true) {
          setIsAuthenticated(true);
          applyAccessData(res.data);
        } else {
          localStorage.removeItem("adminToken");
          delete axiosInstance.defaults.headers.common["Authorization"];
          setUser(null);
          setModules([]);
          setPermissions([]);
          setProductFields({});
        }
      })
      .catch(() => {
        localStorage.removeItem("adminToken");
        delete axiosInstance.defaults.headers.common["Authorization"];
        setUser(null);
        setModules([]);
        setPermissions([]);
        setProductFields({});
      })
      .finally(() => setSessionLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axiosInstance.post(
      "/api/auth/login",
      { email: email.trim(), password },
      { headers: { "Content-Type": "application/json" } }
    );

    const token = res.data?.accessToken;
    if (!token) throw new Error("No token received");
    localStorage.setItem("adminToken", token);
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const me = await axiosInstance.get("/api/auth/me");
    if (me.data?.user?.role !== "admin" && me.data?.user?.isSuperAdmin !== true) {
      localStorage.removeItem("adminToken");
      delete axiosInstance.defaults.headers.common["Authorization"];
      throw new Error("This account is not authorized for the admin panel.");
    }
    setIsAuthenticated(true);
    applyAccessData(me.data);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    delete axiosInstance.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    setUser(null);
    setModules([]);
    setPermissions([]);
    setProductFields({});
  };

  const hasModule = (module: string): boolean => {
    return modules.includes(module);
  };

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes("*")) return true;
    if (permissions.includes(permission)) return true;
    const mod = permission.split(".")[0];
    if (!mod) return false;
    return permissions.includes(`${mod}.*`) || permissions.includes(mod);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        login,
        logout,
        isAuthenticated,
        user,
        modules,
        permissions,
        productFields,
        hasModule,
        hasPermission,
        sessionLoading,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};
