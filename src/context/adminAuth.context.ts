import { createContext } from "react";

export interface AdminAuthType {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  user: {
    name: string;
    email: string;
    role?: string;
    organizationId?: string | null;
    isSuperAdmin?: boolean;
  } | null;
  modules: string[];
  /** Tenant display name from GET /api/auth/me (empty for platform super-admin). */
  organizationName: string;
  permissions: string[];
  productFields: Record<string, boolean>;
  hasModule: (module: string) => boolean;
  hasPermission: (permission: string) => boolean;
  /** True until initial session (admin token + /me) is resolved */
  sessionLoading: boolean;
}

export const AdminAuthContext = createContext<AdminAuthType | null>(null);
