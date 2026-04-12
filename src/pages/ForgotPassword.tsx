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
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Email required", status: "warning", duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/forgot-password", { email: trimmed });
      const data = res.data as { message?: string; resetToken?: string; expiresInMinutes?: number };
      toast({ title: "Request received", description: data.message, status: "success", duration: 5000 });
      if (typeof data.resetToken === "string" && data.resetToken.length > 0) {
        navigate("/reset-password", {
          state: { email: trimmed, token: data.resetToken },
          replace: true,
        });
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      toast({
        title: "Request failed",
        description: ax.response?.data?.message ?? "Try again later",
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.100" p={4}>
      <Box bg="white" p={10} rounded="xl" shadow="lg" w="100%" maxW="420px">
        <VStack spacing={6} align="stretch">
          <Heading size="lg" textAlign="center">
            Forgot password
          </Heading>
          <Text fontSize="sm" color="gray.600">
            For <strong>organization admins</strong> and <strong>platform super-admins</strong> only. Enter the email
            you use to sign in to this admin panel.
          </Text>
          <Alert status="info" borderRadius="md" fontSize="sm">
            <AlertIcon />
            <AlertDescription>
              In production, use email delivery. For local dev, set{" "}
              <code>PASSWORD_RESET_RETURN_TOKEN=true</code> in the API <code>.env</code> to receive a one-time reset
              token and continue to the reset page.
            </AlertDescription>
          </Alert>
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>
          <Button colorScheme="orange" size="lg" isLoading={loading} onClick={() => void handleSubmit()}>
            Send reset instructions
          </Button>
          <Text textAlign="center" fontSize="sm">
            <Link to="/login">Back to login</Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
