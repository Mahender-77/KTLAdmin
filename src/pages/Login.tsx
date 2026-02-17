import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  VStack,
  useToast,
  Link,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/useAdminAuth";

export default function Login() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch {
      toast({
        title: "Login Failed",
        description: "Invalid credentials",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.100">
      <Box bg="white" p={10} rounded="xl" shadow="lg" w="400px">
        <VStack spacing={6} align="stretch">
          <Heading size="lg" textAlign="center">
            Admin Login
          </Heading>

          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>

          <Button
            colorScheme="orange"
            size="lg"
            isLoading={loading}
            onClick={handleLogin}
          >
            Sign In
          </Button>

          <Text textAlign="center" fontSize="sm">
            New Admin?{" "}
            <Link color="orange.500" onClick={() => navigate("/register")}>
              Create Account
            </Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
