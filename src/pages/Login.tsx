import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Text,
  VStack,
  useToast,
  Link,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAdminAuth } from "../context/useAdminAuth";

export default function Login() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({ title: "Email required", description: "Please enter your email", status: "warning", duration: 3000 });
      return;
    }
    if (!password) {
      toast({ title: "Password required", description: "Please enter your password", status: "warning", duration: 3000 });
      return;
    }
    try {
      setLoading(true);
      await login(trimmedEmail, password);
      navigate("/");
    } catch (err: unknown) {
      if (err instanceof Error && !(err as { response?: unknown }).response) {
        toast({
          title: "Login Failed",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      const ax = err as {
        response?: {
          data?: {
            message?: string;
            detail?: { errors?: Record<string, unknown> };
          };
        };
      };
      const message = ax.response?.data?.message ?? "Invalid credentials";
      const errors = ax.response?.data?.detail?.errors as Record<string, string[] | Record<string, string[]>> | undefined;
      const collectMessages = (o: unknown): string[] => {
        if (Array.isArray(o)) return o.filter((x): x is string => typeof x === "string");
        if (o && typeof o === "object") return Object.values(o).flatMap(collectMessages);
        return [];
      };
      const msgList = errors ? collectMessages(errors) : [];
      const description = msgList.length > 0 ? msgList.join(". ") : message;
      toast({
        title: "Login Failed",
        description,
        status: "error",
        duration: 5000,
        isClosable: true,
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
            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <InputRightElement>
                <IconButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  size="sm"
                  variant="ghost"
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPassword((v) => !v)}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <Text fontSize="sm" textAlign="right">
            <Link as={RouterLink} to="/forgot-password" color="orange.500" fontWeight="600">
              Forgot password?
            </Link>
          </Text>

          <Button
            colorScheme="orange"
            size="lg"
            isLoading={loading}
            onClick={handleLogin}
          >
            Sign In
          </Button>

          <Text textAlign="center" fontSize="sm" color="gray.600">
            New admins are added by an existing admin after sign-in (Create admin in the sidebar).
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
