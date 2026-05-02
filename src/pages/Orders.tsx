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
  useToast,
  HStack,
  Badge,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  Divider,
  Flex,
  Link,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { AdminAuthContext } from "../context/adminAuth.context";
import axiosInstance from "../services/axiosInstance";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { sanitizeText } from "../utils/sanitizeHtml";

interface User {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface OrderAddress {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
}

interface OrderItem {
  product: { _id: string; name?: string; images?: string[] };
  variant: string;
  quantity: number;
  price: number;
}

interface SubOrder {
  _id: string;
  categoryName: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryStatus: string;
  deliveryBoyId?: User | null;
}

interface Order {
  _id: string;
  user: User;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  /** Pool / last-mile rider who accepted the order in the courier app */
  deliveryBoy?: User | null;
  deliveryPerson?: User | null;
  /** Order-level lifecycle from marketplace delivery flow */
  deliveryStatus?: string | null;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  address?: OrderAddress;
  subOrders?: SubOrder[];
  createdAt: string;
}

/** Response from GET /api/orders/admin/:id/tracking (same as customer/delivery tracking payload). */
interface OrderTrackingPayload {
  deliveryPerson: { name?: string; phone?: string } | null;
  location: {
    latitude: number | null;
    longitude: number | null;
    lastUpdated?: string | null;
  } | null;
  deliveryStatus: string | null;
  subOrders?: Array<{
    _id?: string;
    deliveryStatus?: string;
    deliveryBoyId?: { name?: string; phone?: string } | null;
    deliveryPersonLocation?: {
      latitude?: number;
      longitude?: number;
      lastUpdated?: string;
    };
  }>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Matches PATCH /api/orders/:id/status body */
type ApiOrderStatus = "confirmed" | "out_for_delivery" | "delivered" | "cancelled";

function dbStatusToDraft(db: string): ApiOrderStatus {
  switch (db) {
    case "shipped":
      return "out_for_delivery";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "placed":
    default:
      return "confirmed";
  }
}

function apiStatusToDbLabel(api: ApiOrderStatus): string {
  switch (api) {
    case "confirmed":
      return "placed";
    case "out_for_delivery":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      return "placed";
  }
}

/** Labels for Order.deliveryStatus (courier pool / handoff) */
function orderDeliveryStatusLabel(s: string | null | undefined): string {
  switch (s) {
    case "pending":
      return "Awaiting rider";
    case "assigned":
      return "Rider assigned";
    case "accepted":
      return "Accepted";
    case "in-transit":
      return "In transit";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    default:
      return s ? sanitizeText(String(s)) : "—";
  }
}

function orderDeliveryStatusColor(s: string | null | undefined): string {
  switch (s) {
    case "delivered":
      return "green";
    case "out_for_delivery":
    case "in-transit":
      return "blue";
    case "assigned":
    case "accepted":
      return "purple";
    default:
      return "gray";
  }
}

function subOrderDeliveryLabel(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "Awaiting courier in app";
    case "accepted":
      return "Courier assigned — prepare handoff";
    case "out_for_delivery":
      return "Picked up / on the way";
    case "delivered":
      return "Delivered to customer";
    default:
      return status ?? "—";
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const e = error as {
    response?: { data?: { message?: string; errorCode?: string }; status?: number };
    message?: string;
  };
  const msg = e?.response?.data?.message ?? e?.message;
  const code = e?.response?.data?.errorCode;
  const status = e?.response?.status;
  if (typeof msg === "string" && msg.trim().length > 0) {
    return code ? `${msg} (${code})` : msg;
  }
  if (typeof status === "number") {
    return `${fallback} (HTTP ${status})`;
  }
  return fallback;
}

export default function Orders() {
  const auth = useContext(AdminAuthContext);
  const toast = useToast();
  const orgId = auth?.user?.organizationId ?? null;
  const tenantRequestConfig = useMemo(
    () =>
      orgId
        ? {
            headers: {
              "x-organization-id": orgId,
            },
          }
        : undefined,
    [orgId]
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState<ApiOrderStatus>("confirmed");
  const [statusSaving, setStatusSaving] = useState(false);
  const [trackingData, setTrackingData] = useState<OrderTrackingPayload | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    console.log("[orders/admin][frontend] auth context", {
      isAuthenticated: auth?.isAuthenticated,
      userId: auth?.user ? (auth.user as { _id?: string })._id ?? null : null,
      role: auth?.user?.role ?? null,
      orgId: orgId ?? null,
      orgName: auth?.organizationName ?? null,
      modules: auth?.modules ?? [],
    });
  }, [auth, orgId]);

  const fetchOrderTracking = useCallback(async (orderId: string) => {
    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const res = await axiosInstance.get<OrderTrackingPayload>(
        `/api/orders/admin/${orderId}/tracking`,
        tenantRequestConfig
      );
      setTrackingData(res.data ?? null);
    } catch (error) {
      setTrackingData(null);
      setTrackingError(
        getApiErrorMessage(
          error,
          "Could not load live tracking. Try Refresh, or confirm this order belongs to your organization."
        )
      );
    } finally {
      setTrackingLoading(false);
    }
  }, [tenantRequestConfig]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPayment !== "all") params.set("paymentStatus", filterPayment);
      const url = `/api/orders/admin/all?${params}`;
      console.log("[orders/admin][frontend] request", {
        url,
        page,
        limit,
        filterStatus,
        filterPayment,
        orgId,
        requestHeaders: tenantRequestConfig?.headers ?? null,
      });
      const res = await axiosInstance.get(url, tenantRequestConfig);
      console.log("[orders/admin][frontend] response", {
        status: res.status,
        returned: Array.isArray(res.data?.data) ? res.data.data.length : -1,
        total: res.data?.total ?? null,
        totalPages: res.data?.totalPages ?? null,
        firstOrderId: Array.isArray(res.data?.data) && res.data.data[0]?._id ? res.data.data[0]._id : null,
      });
      setOrders(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch (e) {
      console.log("[orders/admin][frontend] request failed", {
        error: e,
        message: getApiErrorMessage(e, "Error loading orders"),
      });
      const msg = getApiErrorMessage(e, "Error loading orders");
      setLoadError(msg);
      toast({ title: "Error loading orders", description: msg, status: "error", duration: 4000 });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPayment, toast, tenantRequestConfig]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (selectedOrder) {
      setStatusDraft(dbStatusToDraft(selectedOrder.orderStatus));
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) {
      setTrackingData(null);
      setTrackingError(null);
      return;
    }
    void fetchOrderTracking(selectedOrder._id);
  }, [selectedOrder, fetchOrderTracking]);

  const handleViewDetails = async (order: Order) => {
    try {
      setDetailLoading(true);
      const res = await axiosInstance.get(`/api/orders/admin/${order._id}`, tenantRequestConfig);
      setSelectedOrder(res.data);
    } catch (e) {
      toast({
        title: "Error loading order details",
        description: getApiErrorMessage(e, "Could not load order details"),
        status: "error",
        duration: 4000,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePatchOrderStatus = async () => {
    if (!selectedOrder) return;
    setStatusSaving(true);
    try {
      const res = await axiosInstance.patch(
        `/api/orders/${selectedOrder._id}/status`,
        {
          status: statusDraft,
        },
        tenantRequestConfig
      );
      const nextDb = apiStatusToDbLabel(statusDraft);
      setSelectedOrder({ ...selectedOrder, orderStatus: nextDb });
      const delivered = res.data?.notification?.delivered === true;
      toast({
        title: "Order status updated",
        description: delivered
          ? "Customer was notified by push."
          : "Customer was not notified (push token missing on customer account).",
        status: delivered ? "success" : "warning",
        duration: 5000,
      });
      await fetchOrders();
      void fetchOrderTracking(selectedOrder._id);
    } catch (error) {
      toast({
        title: "Could not update order status",
        description: getApiErrorMessage(error, "Request failed"),
        status: "error",
        duration: 4000,
      });
    } finally {
      setStatusSaving(false);
    }
  };

  const filteredOrders = searchQuery
    ? orders.filter(
        (o) =>
          o.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o._id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  const statusColor = (s: string) =>
    s === "delivered" ? "green" : s === "cancelled" ? "red" : s === "shipped" ? "blue" : "orange";
  const paymentColor = (s: string) =>
    s === "paid" ? "green" : s === "failed" ? "red" : "gray";

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Heading mb={2}>Orders</Heading>
        {auth?.organizationName ? (
          <Text fontSize="sm" color="gray.600" mb={2}>
            Orders placed by customers in{" "}
            <Text as="span" fontWeight="600" color="gray.700">
              {sanitizeText(auth.organizationName)}
            </Text>
            ’s storefront — only items from your catalog and inventory ({auth.user?.organizationId ? (
              <Text as="span" fontSize="xs" color="gray.400" fontFamily="mono">
                org {String(auth.user.organizationId).slice(-8)}
              </Text>
            ) : "this tenant"}).
          </Text>
        ) : (
          <Text fontSize="sm" color="gray.600" mb={2}>
            Only orders for products sold under your organization&apos;s marketplace account are listed.
          </Text>
        )}
        <Alert status="info" borderRadius="md" fontSize="sm" mb={4}>
          <AlertIcon />
          <AlertDescription>
            Courier acceptance, store pickup, customer OTP, and live GPS are handled in the{" "}
            <strong>courier app</strong>. Here you confirm order status (notifies the buyer) and monitor tracking below.
          </AlertDescription>
        </Alert>
        {loadError ? (
          <Alert status="error" borderRadius="md" fontSize="sm" mb={4}>
            <AlertIcon />
            <AlertDescription>{sanitizeText(loadError)}</AlertDescription>
          </Alert>
        ) : null}

        <Box bg="white" p={5} rounded="lg" shadow="sm" mb={6}>
          <HStack spacing={4} flexWrap="wrap" mb={4}>
            <InputGroup maxW="280px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by customer, email, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="gray.50"
                border="none"
              />
            </InputGroup>
            <Select
              maxW="160px"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              bg="gray.50"
              border="none"
            >
              <option value="all">All Status</option>
              <option value="placed">Placed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select
              maxW="160px"
              value={filterPayment}
              onChange={(e) => { setFilterPayment(e.target.value); setPage(1); }}
              bg="gray.50"
              border="none"
            >
              <option value="all">All Payment</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </Select>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            Showing {filteredOrders.length} of {total} orders
          </Text>
        </Box>

        <Box bg="white" rounded="lg" shadow="sm" overflow="hidden">
          {loading ? (
            <Box p={10} textAlign="center" color="gray.500">Loading orders...</Box>
          ) : filteredOrders.length === 0 ? (
            <Box p={10} textAlign="center" color="gray.500">No orders found</Box>
          ) : (
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Order ID</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th>Total</Th>
                  <Th>Payment</Th>
                  <Th>Order status</Th>
                  <Th>Delivery</Th>
                  <Th>Assigned rider</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredOrders.map((order) => (
                  <Tr key={order._id} _hover={{ bg: "gray.50" }}>
                    <Td>
                      <Text fontSize="xs" fontFamily="mono" color="gray.600">
                        {order._id.slice(-8).toUpperCase()}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontWeight="600">{sanitizeText(order.user?.name ?? "-")}</Text>
                      <Text fontSize="xs" color="gray.500">{sanitizeText(order.user?.email ?? "")}</Text>
                    </Td>
                    <Td fontSize="sm">{formatDate(order.createdAt)}</Td>
                    <Td fontWeight="600">Rs.{Number(order.totalAmount || 0).toLocaleString()}</Td>
                    <Td>
                      <Badge colorScheme={paymentColor(order.paymentStatus ?? "")}>
                        {sanitizeText(order.paymentStatus ?? "-")}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={statusColor(order.orderStatus ?? "")}>
                        {sanitizeText(order.orderStatus ?? "-")}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={orderDeliveryStatusColor(order.deliveryStatus ?? undefined)}>
                        {orderDeliveryStatusLabel(order.deliveryStatus ?? undefined)}
                      </Badge>
                    </Td>
                    <Td>
                      {order.deliveryBoy?.name ? (
                        <Text fontSize="sm">{sanitizeText(order.deliveryBoy.name)}</Text>
                      ) : order.deliveryPerson?.name ? (
                        <Text fontSize="sm">{sanitizeText(order.deliveryPerson.name)}</Text>
                      ) : (
                        <Text fontSize="sm" color="gray.400">—</Text>
                      )}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="orange"
                        onClick={() => handleViewDetails(order)}
                      >
                        View Details
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}

          {totalPages > 1 && (
            <Flex justify="center" gap={2} p={4} borderTop="1px solid" borderColor="gray.100">
              <Button size="sm" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Text alignSelf="center" fontSize="sm">Page {page} of {totalPages}</Text>
              <Button size="sm" isDisabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </Flex>
          )}
        </Box>
      </Box>

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {detailLoading ? (
              <Box py={10} textAlign="center">Loading...</Box>
            ) : selectedOrder ? (
              <VStack align="stretch" spacing={4}>
                <Flex justify="space-between" wrap="wrap" gap={2}>
                  <Badge colorScheme={statusColor(selectedOrder.orderStatus ?? "")}>
                    {sanitizeText(selectedOrder.orderStatus ?? "-")}
                  </Badge>
                  <Badge colorScheme={paymentColor(selectedOrder.paymentStatus ?? "")}>
                    {sanitizeText(selectedOrder.paymentStatus ?? "-")}
                  </Badge>
                </Flex>

                <Box borderWidth="1px" borderColor="gray.200" rounded="md" p={4} bg="gray.50">
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                    UPDATE ORDER STATUS (NOTIFIES CUSTOMER)
                  </Text>
                  <Text fontSize="sm" color="gray.600" mb={3}>
                    Same organization as this admin account. Delivery progress per category appears below; delivery
                    partners use the courier app for pickup and transit.
                  </Text>
                  <HStack spacing={3} flexWrap="wrap" align="flex-end">
                    <Box minW="220px">
                      <Text fontSize="xs" mb={1} color="gray.500">
                        New status
                      </Text>
                      <Select
                        size="sm"
                        bg="white"
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value as ApiOrderStatus)}
                      >
                        <option value="confirmed">Confirmed — preparing</option>
                        <option value="out_for_delivery">Out for delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </Select>
                    </Box>
                    <Button
                      size="sm"
                      colorScheme="orange"
                      isLoading={statusSaving}
                      loadingText="Saving"
                      onClick={() => void handlePatchOrderStatus()}
                    >
                      {"Save & notify"}
                    </Button>
                  </HStack>
                </Box>

                <Box borderWidth="1px" borderColor="green.200" rounded="md" p={4} bg="green.50">
                  <Text fontSize="xs" fontWeight="bold" color="green.800" mb={2}>
                    RIDER ASSIGNMENT & HANDOFF (COURIER APP — READ ONLY)
                  </Text>
                  <Text fontSize="sm" color="gray.700" mb={3}>
                    When a rider accepts this order in the courier app, they appear here. Pickup at the store and customer OTP are done in that app; packing is your internal process for each category below.
                  </Text>
                  <HStack spacing={3} flexWrap="wrap" mb={2}>
                    <Badge colorScheme={orderDeliveryStatusColor(selectedOrder.deliveryStatus ?? undefined)}>
                      {orderDeliveryStatusLabel(selectedOrder.deliveryStatus ?? undefined)}
                    </Badge>
                  </HStack>
                  {selectedOrder.deliveryBoy?.name ? (
                    <Text fontSize="sm" fontWeight="600" mb={1}>
                      Assigned rider: {sanitizeText(selectedOrder.deliveryBoy.name)}
                      {selectedOrder.deliveryBoy.phone ? (
                        <Text as="span" fontWeight="400" color="gray.600">
                          {" "}
                          · {sanitizeText(selectedOrder.deliveryBoy.phone)}
                        </Text>
                      ) : null}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      No rider has accepted this order yet — it remains in the courier pool until someone accepts in the app.
                    </Text>
                  )}
                  <VStack align="stretch" spacing={1} fontSize="xs" color="gray.600">
                    {selectedOrder.acceptedAt ? (
                      <Text>Rider accepted: {formatDate(selectedOrder.acceptedAt)}</Text>
                    ) : null}
                    {selectedOrder.pickedUpAt ? (
                      <Text>Picked up from store / out for delivery: {formatDate(selectedOrder.pickedUpAt)}</Text>
                    ) : null}
                    {selectedOrder.deliveredAt ? (
                      <Text>Completed: {formatDate(selectedOrder.deliveredAt)}</Text>
                    ) : null}
                  </VStack>
                  {!selectedOrder.deliveryBoy?.name && selectedOrder.deliveryPerson?.name ? (
                    <Text fontSize="xs" color="gray.600" mt={2}>
                      Delivery contact (legacy): {sanitizeText(selectedOrder.deliveryPerson.name)}
                    </Text>
                  ) : null}
                  {selectedOrder.deliveryPerson?.name &&
                  selectedOrder.deliveryBoy?.name &&
                  String(selectedOrder.deliveryPerson._id ?? "") !==
                    String(selectedOrder.deliveryBoy._id ?? "") ? (
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      Additional contact: {sanitizeText(selectedOrder.deliveryPerson.name ?? "")}
                    </Text>
                  ) : null}
                </Box>

                <Alert status="warning" borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  <AlertDescription>
                    <strong>Customer OTP:</strong> The courier sends it from their app after pickup; your buyer gets the code by push notification for doorstep confirmation. OTPs are never shown in the admin panel.
                  </AlertDescription>
                </Alert>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>CUSTOMER</Text>
                  <Text fontWeight="600">{sanitizeText(selectedOrder.user?.name ?? "-")}</Text>
                  <Text fontSize="sm" color="gray.600">{sanitizeText(selectedOrder.user?.email ?? "")}</Text>
                  <Text fontSize="sm" color="gray.600">{sanitizeText(selectedOrder.user?.phone ?? "")}</Text>
                </Box>

                {selectedOrder.address && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>DELIVERY ADDRESS</Text>
                    <Text>{sanitizeText(selectedOrder.address.name)}</Text>
                    <Text fontSize="sm">{sanitizeText(selectedOrder.address.address)}</Text>
                    <Text fontSize="sm">
                      {sanitizeText(selectedOrder.address.city)}, {sanitizeText(selectedOrder.address.pincode)}
                    </Text>
                    <Text fontSize="sm">
                      Phone: {sanitizeText(selectedOrder.address.phone)}
                    </Text>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>ORDER ITEMS</Text>
                  <VStack align="stretch" spacing={2}>
                    {(selectedOrder.items ?? []).map((item: OrderItem, i: number) => (
                      <Flex key={i} justify="space-between" p={2} bg="gray.50" rounded="md" fontSize="sm">
                        <Text fontWeight="600">{sanitizeText(item.product?.name ?? "Product")}</Text>
                        <Text>
                          {item.quantity} x Rs.{Number(item.price).toLocaleString()} = Rs.
                          {(item.quantity * Number(item.price)).toLocaleString()}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                </Box>

                {(selectedOrder.subOrders ?? []).length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                      PACK / FULFIL BY CATEGORY (SUB-ORDERS)
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Each block is a separate bundle for fulfilment; couriers work these from the delivery app alongside the main ride assignment above.
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      {(selectedOrder.subOrders ?? []).map((sub: SubOrder) => (
                        <Box key={sub._id} p={3} bg="gray.50" rounded="md" borderWidth="1px" borderColor="gray.200">
                          <Flex justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                            <Text fontWeight="600">{sanitizeText(sub.categoryName)}</Text>
                            <Badge fontSize="xs" colorScheme="blue">{sanitizeText(sub.deliveryStatus)}</Badge>
                          </Flex>
                          <Text fontSize="xs" color="gray.600" mb={1}>
                            {subOrderDeliveryLabel(sub.deliveryStatus)}
                          </Text>
                          {sub.deliveryBoyId && (
                            <Text fontSize="xs" color="gray.600">
                              Courier on this segment: {sanitizeText(sub.deliveryBoyId.name)}
                              {sub.deliveryBoyId.phone ? ` · ${sanitizeText(sub.deliveryBoyId.phone)}` : ""}
                            </Text>
                          )}
                          <Text fontSize="sm" mt={1}>Subtotal: Rs.{Number(sub.totalAmount).toLocaleString()}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}

                <Box borderWidth="1px" borderColor="blue.200" rounded="md" p={4} bg="blue.50">
                  <Flex justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
                    <Text fontSize="xs" fontWeight="bold" color="blue.800">
                      LIVE TRACKING (READ-ONLY — SAME DATA AS CUSTOMER APP)
                    </Text>
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="blue"
                      isLoading={trackingLoading}
                      onClick={() => selectedOrder && void fetchOrderTracking(selectedOrder._id)}
                    >
                      Refresh
                    </Button>
                  </Flex>
                  <Text fontSize="sm" color="gray.700" mb={3}>
                    Courier location and sub-order statuses update as the delivery partner uses the courier app.
                  </Text>
                  {trackingError && (
                    <Text fontSize="sm" color="red.600" mb={2}>
                      {trackingError}
                    </Text>
                  )}
                  {trackingLoading && !trackingData ? (
                    <Text fontSize="sm" color="gray.600">Loading tracking…</Text>
                  ) : trackingData ? (
                    <VStack align="stretch" spacing={3}>
                      {(trackingData.deliveryPerson?.name || trackingData.deliveryPerson?.phone) && (
                        <Box>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>ASSIGNED COURIER (ORDER)</Text>
                          <Text fontSize="sm">
                            {sanitizeText(trackingData.deliveryPerson?.name ?? "—")}
                            {trackingData.deliveryPerson?.phone
                              ? ` · ${sanitizeText(trackingData.deliveryPerson.phone)}`
                              : ""}
                          </Text>
                        </Box>
                      )}
                      {trackingData.deliveryStatus && (
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="600">Order delivery status: </Text>
                          {sanitizeText(trackingData.deliveryStatus)}
                        </Text>
                      )}
                      {trackingData.location?.latitude != null &&
                      trackingData.location?.longitude != null &&
                      !Number.isNaN(Number(trackingData.location.latitude)) &&
                      !Number.isNaN(Number(trackingData.location.longitude)) ? (
                        <Box>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>LAST KNOWN LOCATION</Text>
                          <Text fontSize="xs" fontFamily="mono" color="gray.800">
                            {Number(trackingData.location.latitude).toFixed(6)},{" "}
                            {Number(trackingData.location.longitude).toFixed(6)}
                          </Text>
                          {trackingData.location.lastUpdated && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              Updated: {formatDate(trackingData.location.lastUpdated)}
                            </Text>
                          )}
                          <Link
                            href={`https://www.google.com/maps?q=${trackingData.location.latitude},${trackingData.location.longitude}`}
                            isExternal
                            color="blue.600"
                            fontSize="sm"
                            fontWeight="600"
                            mt={2}
                            display="inline-block"
                          >
                            Open in Google Maps
                          </Link>
                        </Box>
                      ) : (
                        <Text fontSize="sm" color="gray.600">
                          No GPS ping yet (courier may not have started or location not shared).
                        </Text>
                      )}
                      {(trackingData.subOrders ?? []).length > 0 && (
                        <Box>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                            SUB-ORDERS (PER CATEGORY — COURIER STATUS)
                          </Text>
                          <VStack align="stretch" spacing={2}>
                            {(trackingData.subOrders ?? []).map((s, idx) => (
                              <Flex
                                key={s._id ?? idx}
                                justify="space-between"
                                align="center"
                                p={2}
                                bg="white"
                                rounded="md"
                                borderWidth="1px"
                                borderColor="blue.100"
                                flexWrap="wrap"
                                gap={2}
                              >
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="600">
                                    {sanitizeText(s.deliveryBoyId?.name ?? "Unassigned")}
                                  </Text>
                                  {s.deliveryBoyId?.phone && (
                                    <Text fontSize="xs" color="gray.600">
                                      {sanitizeText(s.deliveryBoyId.phone)}
                                    </Text>
                                  )}
                                </VStack>
                                <Badge colorScheme="blue">{sanitizeText(s.deliveryStatus ?? "—")}</Badge>
                              </Flex>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.600">Tracking unavailable.</Text>
                  )}
                </Box>

                <Flex justify="flex-end" pt={2}>
                  <Text fontSize="lg" fontWeight="800" color="orange.500">
                    Total: Rs.{Number(selectedOrder.totalAmount).toLocaleString()}
                  </Text>
                </Flex>

                <Text fontSize="xs" color="gray.400">
                  Order placed: {formatDate(selectedOrder.createdAt)}
                </Text>
              </VStack>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
