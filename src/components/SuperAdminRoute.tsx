import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Center, Spinner } from "@chakra-ui/react";
import { useAdminAuth } from "../context/useAdminAuth";

interface Props {
  children: ReactNode;
}

export default function SuperAdminRoute({ children }: Props) {
  const { isAuthenticated, sessionLoading, user } = useAdminAuth();

  if (sessionLoading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" color="orange.500" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
