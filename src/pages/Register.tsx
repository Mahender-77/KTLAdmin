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
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

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

      await axiosInstance.post("/api/admin/create-admin", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      toast({
        title: "Admin created",
        description: "The new admin can sign in from the login page.",
        status: "success",
        duration: 4000,
      });

      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as {
          message?: string;
          detail?: { errors?: Record<string, string[] | string[][]> };
        };
        const message = data?.message ?? "Could not create admin";
        const errs = data?.detail?.errors;
        const flat =
          errs &&
          Object.values(errs)
            .flat()
            .filter((x): x is string => typeof x === "string");
        toast({
          title: "Failed",
          description: flat?.length ? flat.join(". ") : message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          status: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Flex ml="260px" mt="70px" p={8} align="center" justify="center" minH="calc(100vh - 70px)">
        <Box bg="white" p={10} rounded="xl" shadow="lg" w="100%" maxW="420px">
          <VStack spacing={6} align="stretch">
            <Heading size="lg" textAlign="center">
              Create admin user
            </Heading>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Only existing admins can add admins. Password: 8+ chars, upper & lower case,
              number, and special character.
            </Text>

            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                placeholder="Full name"
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
              Create admin
            </Button>

            <Text textAlign="center" fontSize="sm">
              <Link color="orange.500" onClick={() => navigate("/")}>
                Back to dashboard
              </Link>
            </Text>
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
}
