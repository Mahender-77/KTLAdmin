import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  FormControl,
  FormLabel,
  Switch,
  useToast,
  Spinner,
  Flex,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import axiosInstance from "../../services/axiosInstance";
import RoleSelector from "../../components/SuperAdmin/RoleSelector";
import { sanitizeText } from "../../utils/sanitizeHtml";

interface UserDetailData {
  _id: string;
  name: string;
  email: string;
  legacyRole: string;
  roleName: string | null;
  roleId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  isSuspended: boolean;
  isSuperAdmin: boolean;
}

interface RoleOption {
  _id: string;
  name: string;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [draftRoleId, setDraftRoleId] = useState<string | null>(null);
  const [draftSuspended, setDraftSuspended] = useState(false);

  const loadUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/super-admin/users/${id}`);
      const u = res.data?.user;
      if (!u?._id) throw new Error("missing");
      setUser(u);
      setDraftRoleId(u.roleId);
      setDraftSuspended(Boolean(u.isSuspended));

      const tid = u.tenantId;
      if (tid && !u.isSuperAdmin) {
        const r = await axiosInstance.get(`/api/super-admin/organizations/${tid}/roles`);
        setRoles((r.data?.data ?? []).map((x: { _id: string; name: string }) => x));
      } else {
        setRoles([]);
      }
    } catch {
      toast({ title: "User not found", status: "error", duration: 4000 });
      navigate("/super-admin/users");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const save = async () => {
    if (!id || !user?.tenantId || user.isSuperAdmin) return;
    setSaving(true);
    try {
      const payload: { roleId?: string; isSuspended?: boolean } = {};
      if (draftRoleId && draftRoleId !== user.roleId) {
        payload.roleId = draftRoleId;
      }
      if (draftSuspended !== user.isSuspended) {
        payload.isSuspended = draftSuspended;
      }
      if (Object.keys(payload).length === 0) {
        toast({ title: "No changes", status: "info", duration: 2000 });
        setSaving(false);
        return;
      }
      const res = await axiosInstance.patch(`/api/super-admin/users/${id}`, payload);
      const next = res.data?.user;
      if (next) {
        setUser(next);
        setDraftRoleId(next.roleId);
        setDraftSuspended(Boolean(next.isSuspended));
      }
      toast({ title: "User updated", status: "success", duration: 3000 });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Update failed";
      toast({ title: msg, status: "error", duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <Box bg="gray.100" minH="100vh">
        <Sidebar />
        <Header />
        <Flex ml="260px" mt="70px" p={8} justify="center">
          <Spinner color="orange.500" size="lg" />
        </Flex>
      </Box>
    );
  }

  const readOnly = user.isSuperAdmin || !user.tenantId;

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Button variant="ghost" mb={4} onClick={() => navigate("/super-admin/users")}>
          ← Back to users
        </Button>

        <Heading size="lg" mb={2}>
          {sanitizeText(user.name)}
        </Heading>
        <Text color="gray.600" mb={6}>
          {sanitizeText(user.email)}
        </Text>

        {user.isSuperAdmin ? (
          <Alert status="info" mb={6} borderRadius="md">
            <AlertIcon />
            Platform super-admins cannot be edited from this screen.
          </Alert>
        ) : null}

        {!user.tenantId ? (
          <Alert status="warning" mb={6} borderRadius="md">
            <AlertIcon />
            User has no tenant — assign organization before changing RBAC roles.
          </Alert>
        ) : null}

        <Box bg="white" rounded="lg" shadow="sm" p={6} maxW="lg">
          <VStack align="stretch" spacing={4}>
            <HStack>
              <Text fontWeight="semibold" w="140px">
                Tenant
              </Text>
              <Text>{user.tenantName ? sanitizeText(user.tenantName) : "—"}</Text>
            </HStack>
            <HStack>
              <Text fontWeight="semibold" w="140px">
                Legacy role
              </Text>
              <Badge>{sanitizeText(user.legacyRole)}</Badge>
            </HStack>
            <HStack>
              <Text fontWeight="semibold" w="140px">
                RBAC role
              </Text>
              <Text fontSize="sm">{user.roleName ? sanitizeText(user.roleName) : "—"}</Text>
            </HStack>

            {!readOnly && (
              <>
                <RoleSelector
                  roles={roles}
                  value={draftRoleId}
                  onChange={setDraftRoleId}
                  isDisabled={saving}
                />
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0}>Suspended</FormLabel>
                  <Switch
                    isChecked={draftSuspended}
                    onChange={(e) => setDraftSuspended(e.target.checked)}
                    colorScheme="orange"
                    isDisabled={saving}
                  />
                </FormControl>
                <Button colorScheme="orange" isLoading={saving} onClick={() => void save()}>
                  Save changes
                </Button>
              </>
            )}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
