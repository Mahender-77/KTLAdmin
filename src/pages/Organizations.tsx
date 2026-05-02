import { Box, Button, Text } from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { colors } from "../../../Ktl/constants/colors";
import { useAdminAuth } from "../context/useAdminAuth";

/** Legacy route `/organizations` — super admins use the tenants list + detail (settings). */
export default function Organizations() {
  const navigate = useNavigate();
  const { user } = useAdminAuth();

  if (user?.isSuperAdmin) {
    return <Navigate to="/super-admin/tenants" replace />;
  }

  return (
    <Box bg={colors.background} minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Text fontSize="2xl" fontWeight="bold" color={colors.textPrimary}>
          Organizations
        </Text>
        <Text fontSize="sm" color={colors.textMuted} mt={1}>
          Organization management is available from the Super Admin dashboard. Contact your
          platform administrator if you need a new tenant.
        </Text>

        <Box mt={6} display="flex" gap={3}>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Dashboard
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
