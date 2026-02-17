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
import axiosInstance from "../services/axiosInstance";
import axios from "axios";

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);

      await axiosInstance.post("/api/auth/register", {
        name,
        email,
        password,
        role: "admin", // Important
      });

      toast({
        title: "Account Created",
        description: "You can now login",
        status: "success",
        duration: 3000,
      });

      navigate("/login");
    } catch (error: unknown) {
  if (axios.isAxiosError(error)) {
    console.log(error.response?.data);
  }
} finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.100">
      <Box bg="white" p={10} rounded="xl" shadow="lg" w="400px">
        <VStack spacing={6} align="stretch">
          <Heading size="lg" textAlign="center">
            Create Admin Account
          </Heading>

          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormControl>

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
            onClick={handleRegister}
          >
            Create Account
          </Button>

          <Text textAlign="center" fontSize="sm">
            Already have an account?{" "}
            <Link color="orange.500" onClick={() => navigate("/login")}>
              Sign In
            </Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
