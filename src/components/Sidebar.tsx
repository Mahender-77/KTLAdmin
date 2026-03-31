import { Box, VStack, Text, Button } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { useAdminAuth } from "../context/useAdminAuth";

export default function Sidebar() {
  const { hasModule } = useAdminAuth();

  const menuItems: Array<{ label: string; to: string; visible: boolean }> = [
    { label: "Dashboard", to: "/", visible: true },
    // Core catalog
    { label: "Products", to: "/products", visible: hasModule("product") },
    { label: "Categories", to: "/categories", visible: hasModule("category") },
    { label: "Stores", to: "/stores", visible: hasModule("store") },
    // Operations
    { label: "Orders", to: "/orders", visible: hasModule("order") },
    // Management
    { label: "Inventory", to: "/stores", visible: hasModule("inventory") },
    { label: "Users", to: "/register", visible: hasModule("user") },
  ];

  return (
    <Box
      w="260px"
      h="100vh"
      bg="gray.900"
      color="white"
      p={6}
      position="fixed"
    >
      <Text fontSize="2xl" fontWeight="bold" mb={10}>
        KTL Admin
      </Text>

      <VStack align="stretch" spacing={4}>
        {menuItems
          .filter((item) => item.visible)
          .map((item) => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <Button
                  justifyContent="flex-start"
                  variant={isActive ? "solid" : "ghost"}
                  colorScheme="orange"
                >
                  {item.label}
                </Button>
              )}
            </NavLink>
          ))}
      </VStack>
    </Box>
  );
}
