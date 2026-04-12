import {
  Flex,
  Text,
  Button,
  Avatar,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/useAdminAuth";
import axiosInstance from "../services/axiosInstance";

export default function Header() {
  const { logout, user, organizationName } = useAdminAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayName = user?.name?.trim() || "Admin";
  const subtitle = user?.isSuperAdmin
    ? "Super admin"
    : organizationName
      ? `Org: ${organizationName}`
      : "Admin";

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters", status: "warning", duration: 4000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New password and confirmation do not match", status: "warning", duration: 4000 });
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast({ title: "Password updated", status: "success", duration: 4000 });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      toast({
        title: "Could not change password",
        description: ax.response?.data?.message ?? "Check your current password",
        status: "error",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const goToForgotPassword = () => {
    logout();
    navigate("/forgot-password", { replace: true });
  };

  return (
    <>
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

        <HStack spacing={3}>
          <Text fontSize="xs" color="gray.500" textAlign="right" display={{ base: "none", md: "block" }}>
            {subtitle}
          </Text>
          <Menu placement="bottom-end">
            <MenuButton
              as={Button}
              variant="ghost"
              p={1}
              minW="auto"
              h="auto"
              borderRadius="full"
              aria-label="Account menu"
            >
              <Avatar size="sm" name={displayName} />
            </MenuButton>
            <MenuList zIndex={20}>
              <MenuItem isDisabled fontWeight="bold" fontSize="sm">
                {displayName}
              </MenuItem>
              {user?.email && (
                <MenuItem isDisabled fontSize="xs" color="gray.500">
                  {user.email}
                </MenuItem>
              )}
              <MenuItem onClick={onOpen}>Change password</MenuItem>
              <MenuItem onClick={goToForgotPassword}>Forgot password (reset)</MenuItem>
              <MenuItem color="red.500" onClick={logout}>
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader>Change password</ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Current password</FormLabel>
                <InputGroup>
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                      size="sm"
                      variant="ghost"
                      icon={showCurrent ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowCurrent((v) => !v)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <FormControl>
                <FormLabel>New password</FormLabel>
                <InputGroup>
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
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
                    autoComplete="new-password"
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
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="orange" isLoading={saving} onClick={() => void handleChangePassword()}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
