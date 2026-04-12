import { useState, useEffect, useCallback, type ReactNode } from "react";
import axiosInstance, { initCsrfToken, setSessionInvalidatedHandler } from "../services/axiosInstance";
import { AdminAuthContext } from "./adminAuth.context";

const REFRESH_KEY = "adminRefreshToken";

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
  const [organizationName, setOrganizationName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [productFields, setProductFields] = useState<Record<string, boolean>>({});

  const applyAccessData = (payload: any) => {
    const nextUser = payload?.user ?? null;
    setUser(nextUser);
    const orgId = nextUser?.organizationId ?? null;
    if (typeof orgId === "string" && orgId.length > 0) {
      localStorage.setItem("adminOrganizationId", orgId);
    } else {
      localStorage.removeItem("adminOrganizationId");
    }
    setModules(Array.isArray(payload?.organization?.modules) ? payload.organization.modules : []);
    setOrganizationName(
      typeof payload?.organization?.name === "string" ? payload.organization.name : ""
    );
    setPermissions(Array.isArray(payload?.permissions) ? payload.permissions : []);
    setProductFields(payload?.productFields ?? {});
  };

  const logout = useCallback(() => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem("adminOrganizationId");
    delete axiosInstance.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    setUser(null);
    setModules([]);
    setOrganizationName("");
    setPermissions([]);
    setProductFields({});
  }, []);

  useEffect(() => {
    setSessionInvalidatedHandler(() => {
      logout();
    });
    return () => setSessionInvalidatedHandler(null);
  }, [logout]);

  useEffect(() => {
    void initCsrfToken();
  }, []);

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
          localStorage.removeItem(REFRESH_KEY);
          delete axiosInstance.defaults.headers.common["Authorization"];
          setUser(null);
          setModules([]);
          setOrganizationName("");
          setPermissions([]);
          setProductFields({});
        }
      })
      .catch(() => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem(REFRESH_KEY);
        delete axiosInstance.defaults.headers.common["Authorization"];
        setUser(null);
        setModules([]);
        setOrganizationName("");
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
    const refreshTok = res.data?.refreshToken;
    localStorage.setItem("adminToken", token);
    if (typeof refreshTok === "string" && refreshTok.length > 0) {
      localStorage.setItem(REFRESH_KEY, refreshTok);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const me = await axiosInstance.get("/api/auth/me");
    if (me.data?.user?.role !== "admin" && me.data?.user?.isSuperAdmin !== true) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem(REFRESH_KEY);
      delete axiosInstance.defaults.headers.common["Authorization"];
      throw new Error("This account is not authorized for the admin panel.");
    }
    setIsAuthenticated(true);
    applyAccessData(me.data);
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
        organizationName,
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
