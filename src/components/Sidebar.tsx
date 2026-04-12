import { Box, VStack, Text, Button } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { useAdminAuth } from "../context/useAdminAuth";

export default function Sidebar() {
  const { hasModule, hasPermission, user } = useAdminAuth();

  const superAdminItems: Array<{ label: string; to: string }> = [
    { label: "Tenants", to: "/super-admin/tenants" },
    { label: "Create tenant", to: "/super-admin/tenants/create" },
    { label: "Module control", to: "/modules" },
    { label: "Audit logs", to: "/super-admin/audit-logs" },
    { label: "Users", to: "/super-admin/users" },
  ];

  const menuItems: Array<{ label: string; to: string; visible: boolean }> = [
    { label: "Dashboard", to: "/", visible: true },
    // Core catalog
    { label: "Products", to: "/products", visible: hasModule("product") },
    { label: "Categories", to: "/categories", visible: hasModule("category") },
    { label: "Stores", to: "/stores", visible: hasModule("store") },
    // Operations
    { label: "Orders", to: "/orders", visible: hasModule("order") },
    // Management
    { label: "Inventory", to: "/inventory", visible: hasModule("inventory") },
    {
      label: "Activity log",
      to: "/audit-entries",
      visible: hasPermission("audit.view"),
    },
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
            <NavLink key={`${item.to}-${item.label}`} to={item.to}>
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

      {user?.isSuperAdmin ? (
        <>
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mt={10} mb={2}>
            Platform
          </Text>
          <VStack align="stretch" spacing={2}>
            {superAdminItems.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {({ isActive }) => (
                  <Button
                    justifyContent="flex-start"
                    size="sm"
                    variant={isActive ? "solid" : "ghost"}
                    colorScheme="orange"
                  >
                    {item.label}
                  </Button>
                )}
              </NavLink>
            ))}
          </VStack>
        </>
      ) : null}
    </Box>
  );
}
