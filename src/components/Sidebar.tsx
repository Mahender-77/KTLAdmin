import { Box, VStack, Text, Button } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
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
        <NavLink to="/">
          {({ isActive }) => (
            <Button
              justifyContent="flex-start"
              variant={isActive ? "solid" : "ghost"}
              colorScheme="orange"
            >
              Dashboard
            </Button>
          )}
        </NavLink>

        <NavLink to="/categories">
          {({ isActive }) => (
            <Button
              justifyContent="flex-start"
              variant={isActive ? "solid" : "ghost"}
              colorScheme="orange"
            >
              Categories
            </Button>
          )}
        </NavLink>

        <NavLink to="/products">
          {({ isActive }) => (
            <Button
              justifyContent="flex-start"
              variant={isActive ? "solid" : "ghost"}
              colorScheme="orange"
            >
              Products
            </Button>
          )}
        </NavLink>
        <NavLink to="/stores">
          {({ isActive }) => (
            <Button
              justifyContent="flex-start"
              variant={isActive ? "solid" : "ghost"}
              colorScheme="orange"
            >
              Stores
            </Button>
          )}
        </NavLink>
      </VStack>
    </Box>
  );
}
