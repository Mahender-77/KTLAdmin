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
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../services/axiosInstance";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

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
  deliveryPerson?: User | null;
  address?: OrderAddress;
  subOrders?: SubOrder[];
  createdAt: string;
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

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const limit = 20;

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPayment !== "all") params.set("paymentStatus", filterPayment);
      const res = await axiosInstance.get(`/api/orders/admin/all?${params}`);
      setOrders(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch (e) {
      console.error(e);
      toast({ title: "Error loading orders", status: "error", duration: 3000 });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPayment, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewDetails = async (order: Order) => {
    try {
      setDetailLoading(true);
      const res = await axiosInstance.get(`/api/orders/admin/${order._id}`);
      setSelectedOrder(res.data);
    } catch (e) {
      console.error(e);
      toast({ title: "Error loading order details", status: "error", duration: 3000 });
    } finally {
      setDetailLoading(false);
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
        <Heading mb={6}>Orders</Heading>

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
                  <Th>Status</Th>
                  <Th>Delivered By</Th>
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
                      <Text fontWeight="600">{order.user?.name ?? "-"}</Text>
                      <Text fontSize="xs" color="gray.500">{order.user?.email ?? ""}</Text>
                    </Td>
                    <Td fontSize="sm">{formatDate(order.createdAt)}</Td>
                    <Td fontWeight="600">Rs.{Number(order.totalAmount || 0).toLocaleString()}</Td>
                    <Td>
                      <Badge colorScheme={paymentColor(order.paymentStatus ?? "")}>
                        {order.paymentStatus ?? "-"}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={statusColor(order.orderStatus ?? "")}>
                        {order.orderStatus ?? "-"}
                      </Badge>
                    </Td>
                    <Td>
                      {order.deliveryPerson?.name ? (
                        <Text fontSize="sm">{order.deliveryPerson.name}</Text>
                      ) : (
                        <Text fontSize="sm" color="gray.400">-</Text>
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
                    {selectedOrder.orderStatus}
                  </Badge>
                  <Badge colorScheme={paymentColor(selectedOrder.paymentStatus ?? "")}>
                    {selectedOrder.paymentStatus}
                  </Badge>
                </Flex>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>CUSTOMER</Text>
                  <Text fontWeight="600">{selectedOrder.user?.name ?? "-"}</Text>
                  <Text fontSize="sm" color="gray.600">{selectedOrder.user?.email ?? ""}</Text>
                  <Text fontSize="sm" color="gray.600">{selectedOrder.user?.phone ?? ""}</Text>
                </Box>

                {selectedOrder.address && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>DELIVERY ADDRESS</Text>
                    <Text>{selectedOrder.address.name}</Text>
                    <Text fontSize="sm">{selectedOrder.address.address}</Text>
                    <Text fontSize="sm">{selectedOrder.address.city}, {selectedOrder.address.pincode}</Text>
                    <Text fontSize="sm">Phone: {selectedOrder.address.phone}</Text>
                  </Box>
                )}

                {selectedOrder.deliveryPerson && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>DELIVERED BY</Text>
                    <Text>{selectedOrder.deliveryPerson.name}</Text>
                    <Text fontSize="sm" color="gray.600">{selectedOrder.deliveryPerson.email}</Text>
                    <Text fontSize="sm" color="gray.600">{selectedOrder.deliveryPerson.phone}</Text>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>ORDER ITEMS</Text>
                  <VStack align="stretch" spacing={2}>
                    {(selectedOrder.items ?? []).map((item: OrderItem, i: number) => (
                      <Flex key={i} justify="space-between" p={2} bg="gray.50" rounded="md" fontSize="sm">
                        <Text fontWeight="600">{item.product?.name ?? "Product"}</Text>
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
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>BY CATEGORY</Text>
                    <VStack align="stretch" spacing={2}>
                      {selectedOrder.subOrders.map((sub: SubOrder) => (
                        <Box key={sub._id} p={3} bg="gray.50" rounded="md" borderWidth="1px" borderColor="gray.200">
                          <Flex justify="space-between" mb={2}>
                            <Text fontWeight="600">{sub.categoryName}</Text>
                            <Badge fontSize="xs">{sub.deliveryStatus}</Badge>
                          </Flex>
                          {sub.deliveryBoyId && (
                            <Text fontSize="xs" color="gray.600">Delivery: {sub.deliveryBoyId.name}</Text>
                          )}
                          <Text fontSize="sm">Subtotal: Rs.{Number(sub.totalAmount).toLocaleString()}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}

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
