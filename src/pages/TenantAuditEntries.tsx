import {
  Box,
  Button,
  Center,
  Code,
  Heading,
  HStack,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import axiosInstance from "../services/axiosInstance";
import { sanitizeText } from "../utils/sanitizeHtml";
import { useAdminAuth } from "../context/useAdminAuth";

interface AuditRow {
  _id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  organizationId?: string;
  userId: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

export default function TenantAuditEntries() {
  const toast = useToast();
  const { hasPermission, sessionLoading, organizationName } = useAdminAuth();
  const canView = hasPermission("audit.view");

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [resolvedOrgName, setResolvedOrgName] = useState<string | null>(null);
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      const res = await axiosInstance.get(`/api/audit-entries?${params.toString()}`);
      setRows((res.data?.data ?? []) as AuditRow[]);
      setTotalPages(res.data?.totalPages ?? 1);
      const n = res.data?.organizationName;
      const oid = res.data?.organizationId;
      setResolvedOrgName(typeof n === "string" && n.length > 0 ? n : null);
      setResolvedOrgId(typeof oid === "string" ? oid : null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to load audit entries";
      toast({ title: msg, status: "error", duration: 6000 });
      setRows([]);
      setResolvedOrgName(null);
      setResolvedOrgId(null);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (sessionLoading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" color="orange.500" />
      </Center>
    );
  }

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  return (
      <Box bg="gray.100" minH="100vh">
        <Sidebar />
        <Header />

        <Box ml="260px" mt="70px" p={8}>
          <Heading size="lg" mb={2}>
            Activity log
          </Heading>
          <Text color="gray.600" fontSize="sm" mb={1}>
            <Text as="span" fontWeight="semibold" color="gray.800">
              {sanitizeText(resolvedOrgName || organizationName || "Your organization")}
            </Text>
            {resolvedOrgId ? (
              <Text as="span" fontSize="xs" display="block" mt={1} wordBreak="break-all">
                ID: {sanitizeText(resolvedOrgId)}
              </Text>
            ) : null}
          </Text>
          <Text color="gray.600" fontSize="sm" mb={6}>
            Tenant-scoped events (orders, catalog, admin sign-in, etc.). Requires{" "}
            <Code fontSize="xs">audit.view</Code>.
          </Text>

          <HStack mb={4} flexWrap="wrap" gap={4} align="flex-end">
            <Box>
              <Text fontSize="sm" mb={1}>
                Action filter
              </Text>
              <Select
                size="sm"
                maxW="240px"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All actions</option>
                <option value="order.placed">order.placed</option>
                <option value="inventory.low_stock">inventory.low_stock</option>
                <option value="inventory.batch_added">inventory.batch_added</option>
                <option value="inventory.threshold_updated">inventory.threshold_updated</option>
                <option value="product.created">product.created</option>
                <option value="product.updated">product.updated</option>
                <option value="product.deleted">product.deleted</option>
                <option value="delivery.suborder_accepted">delivery.suborder_accepted</option>
                <option value="delivery.suborder_out_for_delivery">delivery.suborder_out_for_delivery</option>
                <option value="delivery.suborder_delivered">delivery.suborder_delivered</option>
                <option value="category.created">category.created</option>
                <option value="category.updated">category.updated</option>
                <option value="category.deleted">category.deleted</option>
                <option value="store.created">store.created</option>
                <option value="store.updated">store.updated</option>
                <option value="store.deleted">store.deleted</option>
                <option value="admin.login">admin.login</option>
              </Select>
            </Box>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActionFilter("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          </HStack>

          <Box bg="white" rounded="lg" shadow="sm" overflow="hidden">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Time</Th>
                  <Th>User</Th>
                  <Th>Action</Th>
                  <Th>Metadata</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={4} textAlign="center" py={8}>
                      Loading…
                    </Td>
                  </Tr>
                ) : rows.length === 0 ? (
                  <Tr>
                    <Td colSpan={4} textAlign="center" py={8}>
                      No entries yet. Sign in again as tenant admin to record <Code fontSize="xs">admin.login</Code>
                      , or perform catalog/order actions.
                    </Td>
                  </Tr>
                ) : (
                  rows.map((r) => (
                    <Tr key={r._id}>
                      <Td fontSize="xs" whiteSpace="nowrap">
                        {sanitizeText(new Date(r.createdAt).toLocaleString())}
                      </Td>
                      <Td fontSize="xs" maxW="200px">
                        {r.userEmail || r.userName ? (
                          <>
                            {r.userName ? <Text fontWeight="medium">{sanitizeText(r.userName)}</Text> : null}
                            {r.userEmail ? (
                              <Text color="gray.600">{sanitizeText(r.userEmail)}</Text>
                            ) : null}
                          </>
                        ) : r.userId ? (
                          <Code fontSize="xs">{sanitizeText(r.userId)}</Code>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        <Code fontSize="xs">{sanitizeText(r.action)}</Code>
                      </Td>
                      <Td maxW="lg">
                        <Code
                          display="block"
                          whiteSpace="pre-wrap"
                          wordBreak="break-word"
                          fontSize="xs"
                          p={2}
                          bg="gray.50"
                          rounded="md"
                        >
                          {sanitizeText(JSON.stringify(r.metadata ?? {}, null, 2))}
                        </Code>
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
