import { Flex, Text, Button, Avatar, HStack } from "@chakra-ui/react";
import { useAdminAuth } from "../context/useAdminAuth";


export default function Header() {
  const { logout } = useAdminAuth();

  return (
    <Flex
      ml="260px"
      h="70px"
      bg="white"
      align="center"
      justify="space-between"
      px={8}
      shadow="sm"
    >
      <Text fontSize="lg" fontWeight="semibold">
        Admin Dashboard
      </Text>

      <HStack spacing={4}>
        <Avatar size="sm" name="Admin" />
        <Button colorScheme="orange" size="sm" onClick={logout}>
          Logout
        </Button>
      </HStack>
    </Flex>
  );
}
