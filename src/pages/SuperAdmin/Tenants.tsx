import {
  Box,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import axiosInstance from "../../services/axiosInstance";
import { sanitizeText } from "../../utils/sanitizeHtml";

interface OrgRow {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
}

export default function Tenants() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/super-admin/organizations", {
        params: { page, limit },
      });
      setRows(res.data?.data ?? []);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch {
      toast({ title: "Failed to load tenants", status: "error", duration: 4000 });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, toast]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return "—";
    }
  };

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <HStack justify="space-between" mb={6}>
          <Box>
            <Heading size="lg">Tenants</Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>
              All organizations on the platform (Super Admin).
            </Text>
          </Box>
          <Button colorScheme="orange" onClick={() => navigate("/super-admin/tenants/create")}>
            Create tenant
          </Button>
        </HStack>

        <Box bg="white" rounded="lg" shadow="sm" overflow="hidden">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th />
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
                    No tenants found.
                  </Td>
                </Tr>
              ) : (
                rows.map((org) => (
                  <Tr
                    key={org._id}
                    _hover={{ bg: "gray.50", cursor: "pointer" }}
                    onClick={() => navigate(`/super-admin/tenants/${org._id}`)}
                  >
                    <Td fontWeight="medium">{sanitizeText(org.name)}</Td>
                    <Td>
                      <Badge colorScheme={org.isActive ? "green" : "red"}>
                        {org.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </Td>
                    <Td color="gray.600">{formatDate(org.createdAt)}</Td>
                    <Td textAlign="right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/super-admin/tenants/${org._id}`);
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
