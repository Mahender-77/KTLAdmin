import {
  Box,
  Button,
  Heading,
  Text,
  Badge,
  HStack,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  Spinner,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import axiosInstance from "../../services/axiosInstance";
import ModuleToggler from "../../components/SuperAdmin/ModuleToggler";
import { sanitizeText } from "../../utils/sanitizeHtml";

interface ContactInfo {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  isSuspended: boolean;
  createdAt?: string | null;
}

interface OrgDetail {
  _id: string;
  name: string;
  isActive: boolean;
  modules: string[];
  planId?: string | null;
  subscriptionStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerId: string | null;
  owner: ContactInfo | null;
  clientAdmins: ContactInfo[];
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/super-admin/organizations/${id}`);
      const o = res.data?.organization;
      if (!o?._id) throw new Error("not found");
      const mapContact = (c: unknown): ContactInfo | null => {
        if (!c || typeof c !== "object") return null;
        const x = c as Record<string, unknown>;
        if (typeof x._id !== "string" && typeof x._id !== "number") return null;
        return {
          _id: String(x._id),
          name: typeof x.name === "string" ? x.name : "",
          email: typeof x.email === "string" ? x.email : "",
          phone: typeof x.phone === "string" ? x.phone : null,
          isSuspended: x.isSuspended === true,
          createdAt: typeof x.createdAt === "string" ? x.createdAt : null,
        };
      };

      const adminsRaw = Array.isArray(o.clientAdmins) ? o.clientAdmins : [];
      const clientAdmins: ContactInfo[] = adminsRaw
        .map((row: unknown) => mapContact(row))
        .filter((x: ContactInfo | null): x is ContactInfo => x != null);

      setOrg({
        _id: String(o._id),
        name: o.name,
        isActive: Boolean(o.isActive),
        modules: Array.isArray(o.modules) ? o.modules : [],
        planId: o.planId ?? null,
        subscriptionStatus: o.subscriptionStatus,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        ownerId: typeof o.ownerId === "string" ? o.ownerId : o.ownerId != null ? String(o.ownerId) : null,
        owner: mapContact(o.owner),
        clientAdmins,
      });
    } catch {
      toast({ title: "Tenant not found", status: "error", duration: 4000 });
      navigate("/super-admin/tenants");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusToggle = async (next: boolean) => {
    if (!org) return;
    setStatusSaving(true);
    try {
      const res = await axiosInstance.patch(`/api/super-admin/organizations/${org._id}/status`, {
        isActive: next,
      });
      const updated = res.data?.organization;
      if (updated) {
        setOrg((prev) =>
          prev
            ? {
                ...prev,
                isActive: Boolean(updated.isActive),
                updatedAt: updated.updatedAt,
              }
            : prev
        );
      }
      toast({ title: "Status updated", status: "success", duration: 2500 });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Update failed";
      toast({ title: msg, status: "error", duration: 5000 });
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading || !org) {
    return (
      <Box bg="gray.100" minH="100vh">
        <Sidebar />
        <Header />
        <Flex ml="260px" mt="70px" p={8} align="center" justify="center" minH="200px">
          <Spinner color="orange.500" size="lg" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Button variant="ghost" mb={4} onClick={() => navigate("/super-admin/tenants")}>
          ← Back to tenants
        </Button>

        <HStack justify="space-between" align="flex-start" mb={6}>
          <Box>
            <Heading size="lg">{sanitizeText(org.name)}</Heading>
            <HStack mt={2} spacing={3}>
              <Badge colorScheme={org.isActive ? "green" : "red"}>
                {org.isActive ? "Active" : "Suspended"}
              </Badge>
              {org.planId && (
                <Badge colorScheme="purple" variant="subtle">
                  Plan-managed
                </Badge>
              )}
              {org.subscriptionStatus && (
                <Badge colorScheme="blue" variant="subtle">
                  {sanitizeText(org.subscriptionStatus)}
                </Badge>
              )}
            </HStack>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Created: {org.createdAt ? new Date(org.createdAt).toLocaleString() : "—"}
            </Text>
          </Box>
        </HStack>

        <Box bg="white" rounded="lg" shadow="sm" p={6} mb={6}>
          <Heading size="sm" mb={4}>
            Primary owner
          </Heading>
          {org.owner ? (
            <Box fontSize="sm">
              <Text>
                <Text as="span" fontWeight="semibold">
                  Name:{" "}
                </Text>
                {sanitizeText(org.owner.name)}
              </Text>
              <Text mt={1}>
                <Text as="span" fontWeight="semibold">
                  Email:{" "}
                </Text>
                {sanitizeText(org.owner.email)}
              </Text>
              {org.owner.phone ? (
                <Text mt={1}>
                  <Text as="span" fontWeight="semibold">
                    Phone:{" "}
                  </Text>
                  {sanitizeText(org.owner.phone)}
                </Text>
              ) : null}
              <HStack mt={2} spacing={2}>
                <Badge colorScheme="orange" variant="subtle">
                  Organization owner
                </Badge>
                {org.owner.isSuspended ? (
                  <Badge colorScheme="red" variant="subtle">
                    Suspended
                  </Badge>
                ) : null}
              </HStack>
            </Box>
          ) : (
            <Text fontSize="sm" color="gray.600">
              No owner record linked.
            </Text>
          )}
        </Box>

        <Box bg="white" rounded="lg" shadow="sm" p={6} mb={6}>
          <Heading size="sm" mb={2}>
            Client administrators
          </Heading>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Tenant users with the admin role (name, email, phone). Excludes platform super-admins.
          </Text>
          {org.clientAdmins.length === 0 ? (
            <Text fontSize="sm" color="gray.600">
              No client admin users found for this tenant.
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Status</Th>
                    <Th>Added</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {org.clientAdmins.map((a) => (
                    <Tr key={a._id}>
                      <Td>{sanitizeText(a.name)}</Td>
                      <Td>{sanitizeText(a.email)}</Td>
                      <Td>{a.phone ? sanitizeText(a.phone) : "—"}</Td>
                      <Td>
                        {a.isSuspended ? (
                          <Badge colorScheme="red">Suspended</Badge>
                        ) : (
                          <Badge colorScheme="green">Active</Badge>
                        )}
                      </Td>
                      <Td fontSize="xs" color="gray.600">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>

        <Box bg="white" rounded="lg" shadow="sm" p={6} mb={6}>
          <Heading size="sm" mb={4}>
            Account status
          </Heading>
          <FormControl display="flex" alignItems="center" maxW="md">
            <FormLabel mb={0}>Active (tenant can operate)</FormLabel>
            <Switch
              isChecked={org.isActive}
              onChange={(e) => void handleStatusToggle(e.target.checked)}
              colorScheme="orange"
              isDisabled={statusSaving}
            />
          </FormControl>
        </Box>

        <Box bg="white" rounded="lg" shadow="sm" p={6}>
          <Heading size="sm" mb={4}>
            Modules
          </Heading>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Enable or disable ecommerce modules for this tenant. Plan-managed modules cannot be
            changed here.
          </Text>
          <ModuleToggler
            organizationId={org._id}
            planId={org.planId}
            initialModules={org.modules}
            onModulesUpdated={(modules) => setOrg((prev) => (prev ? { ...prev, modules } : prev))}
          />
        </Box>
      </Box>
    </Box>
  );
}
