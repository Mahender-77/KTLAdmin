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
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import InventoryModuleRoute from "../components/InventoryModuleRoute";
import axiosInstance from "../services/axiosInstance";
import { sanitizeText } from "../utils/sanitizeHtml";
import { useAdminAuth } from "../context/useAdminAuth";

interface InvRow {
  _id: string;
  productId: string;
  productName: string | null;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: string;
}

export default function Inventory() {
  const toast = useToast();
  const { hasPermission } = useAdminAuth();
  const canUpdate = hasPermission("inventory.update");
  const [rows, setRows] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await axiosInstance.get(`/api/inventory?${params.toString()}`);
      const data = (res.data?.data ?? []) as InvRow[];
      setRows(data);
      setTotalPages(res.data?.totalPages ?? 1);
      const next: Record<string, number> = {};
      for (const r of data) {
        next[r.productId] = r.lowStockThreshold;
      }
      setDrafts(next);
    } catch {
      toast({ title: "Failed to load inventory", status: "error", duration: 4000 });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveThreshold = async (productId: string) => {
    const v = drafts[productId];
    if (v === undefined || Number.isNaN(v) || v < 0) {
      toast({ title: "Invalid threshold", status: "warning", duration: 3000 });
      return;
    }
    setSavingId(productId);
    try {
      await axiosInstance.patch(`/api/inventory/products/${productId}/threshold`, {
        lowStockThreshold: v,
      });
      toast({ title: "Threshold saved", status: "success", duration: 2500 });
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Save failed";
      toast({ title: msg, status: "error", duration: 5000 });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <InventoryModuleRoute>
      <Box bg="gray.100" minH="100vh">
        <Sidebar />
        <Header />

        <Box ml="260px" mt="70px" p={8}>
          <Heading size="lg" mb={2}>
            Inventory
          </Heading>
          <Text color="gray.600" fontSize="sm" mb={6}>
            Stock rollups per product (same totals as batch quantities). Set a low-stock threshold to
            trigger domain audit events when quantity is at or below it.
          </Text>

          <Box bg="white" rounded="lg" shadow="sm" overflow="hidden">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Product</Th>
                  <Th isNumeric>Qty (base units)</Th>
                  <Th>Low-stock threshold</Th>
                  <Th>Updated</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={5} textAlign="center" py={8}>
                      Loading…
                    </Td>
                  </Tr>
                ) : rows.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} textAlign="center" py={8}>
                      No inventory rows yet — place orders or add batches to populate rollups.
                    </Td>
                  </Tr>
                ) : (
                  rows.map((r) => (
                    <Tr key={r._id}>
                      <Td fontWeight="medium">
                        {r.productName ? sanitizeText(r.productName) : "—"}
                      </Td>
                      <Td isNumeric>{r.quantity}</Td>
                      <Td>
                        <HStack maxW="220px">
                          <NumberInput
                            size="sm"
                            min={0}
                            value={drafts[r.productId] ?? r.lowStockThreshold}
                            onChange={(_, n) =>
                              setDrafts((d) => ({ ...d, [r.productId]: Number.isFinite(n) ? n : 0 }))
                            }
                            isDisabled={!canUpdate || savingId === r.productId}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                          {canUpdate ? (
                            <Button
                              size="sm"
                              colorScheme="orange"
                              isLoading={savingId === r.productId}
                              onClick={() => void saveThreshold(r.productId)}
                            >
                              Save
                            </Button>
                          ) : null}
                        </HStack>
                      </Td>
                      <Td fontSize="xs" color="gray.600">
                        {new Date(r.lastUpdated).toLocaleString()}
                      </Td>
                      <Td />
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
    </InventoryModuleRoute>
  );
}
