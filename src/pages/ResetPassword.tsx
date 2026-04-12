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
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";

type LocationState = { email?: string; token?: string } | null;

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const st = location.state as LocationState;
    if (st?.email) setEmail(st.email);
    if (st?.token) setToken(st.token);
  }, [location.state]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedToken = token.trim();
    if (!trimmedEmail || !trimmedToken) {
      toast({ title: "Email and reset token are required", status: "warning", duration: 4000 });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", status: "warning", duration: 4000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", status: "warning", duration: 4000 });
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post("/api/auth/reset-password", {
        email: trimmedEmail,
        token: trimmedToken,
        newPassword,
        confirmPassword,
      });
      toast({
        title: "Password reset",
        description: "You can sign in with your new password.",
        status: "success",
        duration: 5000,
      });
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      toast({
        title: "Reset failed",
        description: ax.response?.data?.message ?? "Invalid or expired token",
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
        <VStack spacing={5} align="stretch">
          <Heading size="lg" textAlign="center">
            Set new password
          </Heading>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Re-enter your new password to confirm. Same flow for super-admin and organization admin accounts.
          </Text>
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Reset token</FormLabel>
            <Input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token" />
          </FormControl>
          <FormControl>
            <FormLabel>New password</FormLabel>
            <InputGroup>
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <InputRightElement>
                <IconButton
                  aria-label={showNew ? "Hide password" : "Show password"}
                  size="sm"
                  variant="ghost"
                  icon={showNew ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowNew((v) => !v)}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          <FormControl>
            <FormLabel>Confirm new password</FormLabel>
            <InputGroup>
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
              <InputRightElement>
                <IconButton
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  size="sm"
                  variant="ghost"
                  icon={showConfirm ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowConfirm((v) => !v)}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          <Button colorScheme="orange" size="lg" isLoading={loading} onClick={() => void handleSubmit()}>
            Update password
          </Button>
          <Text textAlign="center" fontSize="sm">
            <Link to="/login">Back to login</Link>
            {" · "}
            <Link to="/forgot-password">Request new token</Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
