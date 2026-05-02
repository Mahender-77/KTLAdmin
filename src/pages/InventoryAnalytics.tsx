import {
  Badge,
  Box,
  Button,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Grid,
  GridItem,
  HStack,
  Heading,
  Select,
  Skeleton,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Header from "../components/Header";
import InventoryModuleRoute from "../components/InventoryModuleRoute";
import Sidebar from "../components/Sidebar";
import axiosInstance from "../services/axiosInstance";
import { sanitizeText } from "../utils/sanitizeHtml";

type RangeKey = "daily" | "weekly" | "monthly";

interface OrderItem {
  product?: { _id?: string; name?: string } | null;
  quantity?: number;
  price?: number;
}

interface OrderRow {
  _id: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  items?: OrderItem[];
}

interface TopProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

interface Metrics {
  totalOrders: number;
  deliveredOrders: number;
  grossRevenue: number;
  estimatedProfit: number;
  topProducts: TopProduct[];
  trend: Array<{ label: string; revenue: number; orders: number }>;
}

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

function periodStart(range: RangeKey, now = new Date()): Date {
  const start = new Date(now);
  if (range === "daily") {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (range === "weekly") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function createCsv(metrics: Metrics, range: RangeKey, marginPct: number): string {
  const lines = [
    `Range,${range}`,
    `Estimated Profit Margin %,${marginPct}`,
    `Total Orders,${metrics.totalOrders}`,
    `Delivered Orders,${metrics.deliveredOrders}`,
    `Gross Revenue,${metrics.grossRevenue.toFixed(2)}`,
    `Estimated Profit,${metrics.estimatedProfit.toFixed(2)}`,
    "",
    "Top Products",
    "Product,Units Sold,Revenue",
    ...metrics.topProducts.map(
      (p) => `"${p.name.replaceAll('"', '""')}",${p.unitsSold},${p.revenue.toFixed(2)}`
    ),
    "",
    "Trend",
    "Bucket,Orders,Revenue",
    ...metrics.trend.map((t) => `"${t.label}",${t.orders},${t.revenue.toFixed(2)}`),
  ];
  return lines.join("\n");
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function InventoryAnalytics() {
  const toast = useToast();
  const [range, setRange] = useState<RangeKey>("daily");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [profitMarginPct, setProfitMarginPct] = useState(25);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const all: OrderRow[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({
          page: String(page),
          limit: "100",
          status: "all",
          paymentStatus: "all",
        });
        const res = await axiosInstance.get(`/api/orders/admin/all?${params.toString()}`);
        const rows = (res.data?.data ?? []) as OrderRow[];
        all.push(...rows);
        totalPages = Number(res.data?.totalPages ?? 1);
        page += 1;
      } while (page <= totalPages && page <= 20);
      setOrders(all);
    } catch {
      setOrders([]);
      toast({ title: "Failed to load analytics", status: "error", duration: 4000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const metrics = useMemo<Metrics>(() => {
    const start = periodStart(range);
    const filtered = orders.filter((o) => {
      const ts = new Date(o.createdAt);
      return !Number.isNaN(ts.getTime()) && ts >= start;
    });

    const delivered = filtered.filter((o) => o.orderStatus === "delivered");
    const grossRevenue = delivered.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const estimatedProfit = grossRevenue * (profitMarginPct / 100);

    const productMap = new Map<string, TopProduct>();
    for (const order of delivered) {
      for (const item of order.items ?? []) {
        const pid = item.product?._id ? String(item.product._id) : "unknown";
        const name = item.product?.name ? sanitizeText(item.product.name) : "Unknown product";
        const qty = Number(item.quantity) || 0;
        const rev = qty * (Number(item.price) || 0);
        const existing = productMap.get(pid);
        if (existing) {
          existing.unitsSold += qty;
          existing.revenue += rev;
        } else {
          productMap.set(pid, { productId: pid, name, unitsSold: qty, revenue: rev });
        }
      }
    }
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 6);

    const bucketMap = new Map<string, { label: string; revenue: number; orders: number }>();
    for (const order of delivered) {
      const d = new Date(order.createdAt);
      const label =
        range === "daily"
          ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : range === "weekly"
            ? d.toLocaleDateString([], { weekday: "short" })
            : d.toLocaleDateString([], { day: "2-digit", month: "short" });
      const key =
        range === "daily"
          ? `${d.getHours()}:${d.getMinutes()}`
          : range === "weekly"
            ? String(d.getDay())
            : String(d.getDate());
      const cur = bucketMap.get(key);
      if (cur) {
        cur.orders += 1;
        cur.revenue += Number(order.totalAmount) || 0;
      } else {
        bucketMap.set(key, { label, orders: 1, revenue: Number(order.totalAmount) || 0 });
      }
    }

    const trend = [...bucketMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    return {
      totalOrders: filtered.length,
      deliveredOrders: delivered.length,
      grossRevenue,
      estimatedProfit,
      topProducts,
      trend,
    };
  }, [orders, range, profitMarginPct]);

  const deliveryRate = metrics.totalOrders
    ? Math.round((metrics.deliveredOrders / metrics.totalOrders) * 100)
    : 0;
  const maxRevenueBar = Math.max(...metrics.trend.map((t) => t.revenue), 1);

  const exportReport = (exportRange: RangeKey) => {
    const csv = createCsv(metrics, exportRange, profitMarginPct);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`org-${exportRange}-analysis-${stamp}.csv`, csv);
    toast({ title: `${exportRange} report downloaded`, status: "success", duration: 2500 });
  };

  return (
    <InventoryModuleRoute>
      <Box bg="gray.100" minH="100vh">
        <Sidebar />
        <Header />

        <Box ml="260px" mt="70px" p={8}>
          <Flex justify="space-between" align={{ base: "start", md: "center" }} mb={6} gap={3} wrap="wrap">
            <Box>
              <Heading size="lg">Inventory Analysis</Heading>
              <Text color="gray.600" fontSize="sm">
                Daily, weekly, monthly sales and estimated profit for your organization.
              </Text>
            </Box>
            <HStack>
              <Button as={RouterLink} to="/inventory" variant="outline">
                Back to Inventory
              </Button>
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                w="140px"
                bg="white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </HStack>
          </Flex>

          <Grid templateColumns={{ base: "1fr", lg: "1.6fr 1fr" }} gap={6}>
            <GridItem>
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                {[
                  { label: "Total Orders", value: metrics.totalOrders, help: `${range} window` },
                  { label: "Gross Revenue", value: `Rs ${metrics.grossRevenue.toFixed(0)}`, help: "Delivered only" },
                  {
                    label: "Estimated Profit",
                    value: `Rs ${metrics.estimatedProfit.toFixed(0)}`,
                    help: `at ${profitMarginPct}% margin`,
                  },
                ].map((card) => (
                  <Box
                    key={card.label}
                    bg="white"
                    rounded="xl"
                    p={5}
                    shadow="sm"
                    animation={`${riseIn} 0.45s ease`}
                  >
                    <Stat>
                      <StatLabel color="gray.600">{card.label}</StatLabel>
                      <Skeleton isLoaded={!loading}>
                        <StatNumber>{card.value}</StatNumber>
                      </Skeleton>
                      <StatHelpText>{card.help}</StatHelpText>
                    </Stat>
                  </Box>
                ))}
              </Grid>

              <Box bg="white" mt={6} p={5} rounded="xl" shadow="sm">
                <Flex justify="space-between" mb={4} align="center">
                  <Text fontWeight="700">Revenue Trend</Text>
                  <Badge colorScheme="purple">{range}</Badge>
                </Flex>
                <HStack align="end" spacing={3} h="220px">
                  {loading ? (
                    <Text color="gray.500">Loading chart…</Text>
                  ) : metrics.trend.length === 0 ? (
                    <Text color="gray.500">No delivered data in this period.</Text>
                  ) : (
                    metrics.trend.map((p) => {
                      const pct = Math.max((p.revenue / maxRevenueBar) * 100, 4);
                      return (
                        <VStack key={p.label} spacing={2} align="center" flex={1}>
                          <Text fontSize="xs" color="gray.500">
                            Rs {Math.round(p.revenue)}
                          </Text>
                          <Box
                            w="100%"
                            maxW="42px"
                            bgGradient="linear(to-t, orange.400, pink.400)"
                            rounded="md"
                            h={`${pct}%`}
                            transition="height 0.45s ease"
                          />
                          <Text fontSize="xs" noOfLines={1} maxW="60px">
                            {p.label}
                          </Text>
                        </VStack>
                      );
                    })
                  )}
                </HStack>
              </Box>
            </GridItem>

            <GridItem>
              <VStack spacing={6} align="stretch">
                <Box bg="white" rounded="xl" p={5} shadow="sm" textAlign="center">
                  <Text fontWeight="700" mb={3}>
                    Delivery Conversion
                  </Text>
                  <CircularProgress value={deliveryRate} color="green.400" size="150px" thickness="10px">
                    <CircularProgressLabel fontWeight="800">{deliveryRate}%</CircularProgressLabel>
                  </CircularProgress>
                  <Text mt={3} color="gray.600" fontSize="sm">
                    Delivered vs total orders in selected period.
                  </Text>
                </Box>

                <Box bg="white" rounded="xl" p={5} shadow="sm">
                  <Text fontWeight="700" mb={3}>
                    Estimated Margin
                  </Text>
                  <Select
                    value={String(profitMarginPct)}
                    onChange={(e) => setProfitMarginPct(Number(e.target.value) || 25)}
                    bg="gray.50"
                  >
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                    <option value="25">25%</option>
                    <option value="30">30%</option>
                    <option value="35">35%</option>
                  </Select>
                  <Text mt={2} fontSize="xs" color="gray.500">
                    Profit is estimated from delivered revenue using selected margin.
                  </Text>
                </Box>

                <Box bg="white" rounded="xl" p={5} shadow="sm">
                  <Text fontWeight="700" mb={3}>
                    Download Reports
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    <Button onClick={() => exportReport("daily")} colorScheme="orange" variant="outline">
                      Download Daily CSV
                    </Button>
                    <Button onClick={() => exportReport("weekly")} colorScheme="orange" variant="outline">
                      Download Weekly CSV
                    </Button>
                    <Button onClick={() => exportReport("monthly")} colorScheme="orange" variant="outline">
                      Download Monthly CSV
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            </GridItem>
          </Grid>

          <Box bg="white" mt={6} p={5} rounded="xl" shadow="sm">
            <Text fontWeight="700" mb={3}>
              Top Selling Products
            </Text>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th isNumeric>Units Sold</Th>
                  <Th isNumeric>Revenue</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={3}>Loading…</Td>
                  </Tr>
                ) : metrics.topProducts.length === 0 ? (
                  <Tr>
                    <Td colSpan={3}>No delivered products in selected period.</Td>
                  </Tr>
                ) : (
                  metrics.topProducts.map((p) => (
                    <Tr key={p.productId}>
                      <Td>{sanitizeText(p.name)}</Td>
                      <Td isNumeric>{p.unitsSold}</Td>
                      <Td isNumeric>Rs {p.revenue.toFixed(0)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Box>
    </InventoryModuleRoute>
  );
}
