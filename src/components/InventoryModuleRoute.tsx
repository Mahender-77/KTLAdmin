import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Center, Spinner } from "@chakra-ui/react";
import { useAdminAuth } from "../context/useAdminAuth";

/**
 * Client routes that require the `inventory` org module (Phase 4).
 */
export default function InventoryModuleRoute({ children }: { children: ReactNode }) {
  const { hasModule, sessionLoading } = useAdminAuth();

  if (sessionLoading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" color="orange.500" />
      </Center>
    );
  }

  if (!hasModule("inventory")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
