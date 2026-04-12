import { Box, Button, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { colors } from "../../../Ktl/constants/colors";

export default function FieldControl() {
  const navigate = useNavigate();

  return (
    <Box bg={colors.background} minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Text fontSize="2xl" fontWeight="bold" color={colors.textPrimary}>
          Field Control (Product Fields)
        </Text>
        <Text fontSize="sm" color={colors.textMuted} mt={1}>
          Coming soon: per-tenant product field visibility rules.
        </Text>

        <Button
          mt={6}
          bg={colors.primary}
          color="white"
          _hover={{ bg: colors.primaryDark }}
          onClick={() => navigate("/")}
        >
          Back to Dashboard
        </Button>
      </Box>
    </Box>
  );
}

