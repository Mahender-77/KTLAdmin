import {
  Box,
  Button,
  Heading,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  useToast,
  Select,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import axiosInstance from "../../services/axiosInstance";
import { sanitizeText } from "../../utils/sanitizeHtml";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  legacyRole: string;
  roleName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  isSuspended: boolean;
}

interface OrgOption {
  _id: string;
  name: string;
}

export default function Users() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const [draftTenant, setDraftTenant] = useState("");
  const [draftRole, setDraftRole] = useState<string>("");
  const [appliedTenant, setAppliedTenant] = useState("");
  const [appliedRole, setAppliedRole] = useState<string>("");

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/super-admin/organizations", {
        params: { page: 1, limit: 200 },
      });
      const data = res.data?.data ?? [];
      setOrgs(
        data.map((o: { _id: string; name: string }) => ({
          _id: String(o._id),
          name: o.name,
        }))
      );
    } catch {
      setOrgs([]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (appliedTenant) params.set("tenantId", appliedTenant);
      if (appliedRole === "user" || appliedRole === "admin" || appliedRole === "delivery") {
        params.set("role", appliedRole);
      }
      const res = await axiosInstance.get(`/api/super-admin/users?${params.toString()}`);
      setRows(res.data?.data ?? []);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch {
      toast({ title: "Failed to load users", status: "error", duration: 4000 });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, appliedTenant, appliedRole, toast]);

  useEffect(() => {
    void fetchOrgs();
  }, [fetchOrgs]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const applyFilters = () => {
    setAppliedTenant(draftTenant);
    setAppliedRole(draftRole);
    setPage(1);
  };

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Heading size="lg" mb={2}>
          Users
        </Heading>
        <Text color="gray.600" fontSize="sm" mb={6}>
          Tenant-scoped users (platform super-admins are not listed). Use filters to narrow by tenant
          or legacy role.
        </Text>

        <HStack flexWrap="wrap" gap={4} mb={6} align="flex-end">
          <FormControl maxW="280px">
            <FormLabel fontSize="sm">Tenant</FormLabel>
            <Select
              size="sm"
              placeholder="All tenants"
              value={draftTenant}
              onChange={(e) => setDraftTenant(e.target.value)}
            >
              {orgs.map((o) => (
                <option key={o._id} value={o._id}>
                  {sanitizeText(o.name)}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl maxW="200px">
            <FormLabel fontSize="sm">Legacy role</FormLabel>
            <Select
              size="sm"
              placeholder="All"
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
            >
              <option value="">All</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="delivery">delivery</option>
            </Select>
          </FormControl>
          <Button size="sm" colorScheme="orange" onClick={applyFilters}>
            Apply
          </Button>
        </HStack>

        <Box bg="white" rounded="lg" shadow="sm" overflow="hidden">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Tenant</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    Loading…
                  </Td>
                </Tr>
              ) : rows.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    No users found.
                  </Td>
                </Tr>
              ) : (
                rows.map((u) => (
                  <Tr
                    key={u._id}
                    _hover={{ bg: "gray.50", cursor: "pointer" }}
                    onClick={() => navigate(`/super-admin/users/${u._id}`)}
                  >
                    <Td fontWeight="medium">{sanitizeText(u.name)}</Td>
                    <Td fontSize="sm">{sanitizeText(u.email)}</Td>
                    <Td fontSize="sm">{u.tenantName ? sanitizeText(u.tenantName) : "—"}</Td>
                    <Td fontSize="sm">
                      {u.roleName ? sanitizeText(u.roleName) : sanitizeText(u.legacyRole)}
                    </Td>
                    <Td>
                      {u.isSuspended ? (
                        <Badge colorScheme="red">Suspended</Badge>
                      ) : (
                        <Badge colorScheme="green">Active</Badge>
                      )}
                    </Td>
                    <Td textAlign="right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/super-admin/users/${u._id}`);
                        }}
                      >
                        View
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <HStack mt={4} spacing={4}>
            <Button
              size="sm"
              isDisabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Text fontSize="sm">
              Page {page} of {totalPages}
            </Text>
            <Button
              size="sm"
              isDisabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </HStack>
        )}
      </Box>
    </Box>
  );
}
