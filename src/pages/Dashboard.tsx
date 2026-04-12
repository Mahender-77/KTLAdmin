import { Box } from "@chakra-ui/react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { colors } from "../../../Ktl/constants/colors";
import { useAdminAuth } from "../context/useAdminAuth";
import SuperAdminDashboard from "./SuperAdminDashboard.tsx";
import ClientAdminDashboard from "./ClientAdminDashboard.tsx";

export default function Dashboard() {
  const { user } = useAdminAuth();

  return (
    <Box bg={colors.background} minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        {user?.isSuperAdmin ? <SuperAdminDashboard /> : <ClientAdminDashboard />}
      </Box>
    </Box>
  );
}
