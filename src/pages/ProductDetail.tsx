import {
  Box,
  Button,
  Heading,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  Badge,
  Flex,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import { ArrowBackIcon, AddIcon } from "@chakra-ui/icons";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { sanitizeText } from "../utils/sanitizeHtml";

const EXPIRING_SOON_DAYS = 7;

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Variant {
  _id: string;
  type: string;
  value: number;
  unit: string;
  price: number;
  offerPrice?: number;
}

interface Store {
  _id: string;
  name: string;
}

interface InventoryBatch {
  _id: string;
  store: Store | string;
  variant?: string;
  quantity: number;
  manufacturingDate?: string;
  expiryDate?: string;
  batchNumber: string;
  costPrice?: number;
}

interface ProductDetailData {
  _id: string;
  name: string;
  description?: string;
  category: Category;
  pricingMode?: "unit" | "custom-weight" | "fixed";
  pricingType?: "fixed" | "dynamic";
  baseUnit?: string;
  pricePerUnit?: number;
  hasExpiry?: boolean;
  variants: Variant[];
  images: string[];
  inventoryBatches?: InventoryBatch[];
  shelfLifeDays?: number;
}

function getBatchStatus(expiryDate: string): "Expired" | "Expiring Soon" | "Healthy" {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
  if (expiry < now) return "Expired";
  if (expiry <= soon) return "Expiring Soon";
  return "Healthy";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);

  const [storeId, setStoreId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [costPrice, setCostPrice] = useState<string>("");

  const loadProduct = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(`/api/products/${id}`);
      setProduct(res.data);
    } catch (error) {
      toast({
        title: "Product not found",
        status: "error",
        duration: 3000,
      });
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const res = await axiosInstance.get("/api/stores");
      setStores(res.data?.data ?? []);
    } catch {
      setStores([]);
    }
  };

  useEffect(() => {
    loadProduct();
    loadStores();
  }, [id]);

  const variantOptions = useMemo(() => product?.variants ?? [], [product]);
  const batches = useMemo(() => product?.inventoryBatches ?? [], [product]);

  const pricingMode =
    product?.pricingMode ??
    (product?.pricingType === "dynamic" ? "unit" : "fixed");
  const isFixed = pricingMode === "fixed";
  const hasExpiry = product?.hasExpiry === true;
  const baseUnit = product?.baseUnit ?? "pcs";

  // When product has expiry and shelf life, suggest expiry = mfg + shelfLifeDays
  useEffect(() => {
    if (!hasExpiry || !manufacturingDate || !product?.shelfLifeDays || product.shelfLifeDays < 1) return;
    const mfg = new Date(manufacturingDate);
    if (Number.isNaN(mfg.getTime())) return;
    const expiry = new Date(mfg);
    expiry.setDate(expiry.getDate() + product.shelfLifeDays);
    setExpiryDate(expiry.toISOString().slice(0, 10));
  }, [manufacturingDate, product?.shelfLifeDays, hasExpiry]);

  const isPcs = baseUnit === "pcs";

  const resetBatchForm = () => {
    setStoreId("");
    setVariantId("");
    setQuantity("");
    setManufacturingDate("");
    setExpiryDate("");
    setBatchNumber("");
    setCostPrice("");
  };

  const handleAddBatch = async () => {
    if (!id || !product) return;

    if (!storeId || !batchNumber.trim()) {
      toast({
        title: "Missing fields",
        description: "Store and Batch number are required",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    const qty = baseUnit === "pcs" ? Math.floor(Number(quantity) || 0) : Number(quantity) || 0;
    if (qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    if (baseUnit === "pcs" && !Number.isInteger(qty)) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be a whole number for pieces",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    if (hasExpiry) {
      if (!manufacturingDate || !expiryDate) {
        toast({
          title: "Missing dates",
          description: "Manufacturing date and Expiry date are required when product has expiry",
          status: "warning",
          duration: 3000,
        });
        return;
      }
      const mfg = new Date(manufacturingDate);
      const exp = new Date(expiryDate);
      if (exp <= mfg) {
        toast({
          title: "Invalid dates",
          description: "Expiry date must be after manufacturing date",
          status: "warning",
          duration: 3000,
        });
        return;
      }
    }

    if (isFixed && !variantId) {
      toast({
        title: "Variant required",
        description: "Select a variant for fixed-pricing products",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        store: storeId,
        quantity: qty,
        batchNumber: batchNumber.trim(),
        costPrice: costPrice !== "" && !Number.isNaN(Number(costPrice)) ? Number(costPrice) : undefined,
      };
      if (isFixed) payload.variant = variantId;
      if (hasExpiry) {
        payload.manufacturingDate = new Date(manufacturingDate).toISOString();
        payload.expiryDate = new Date(expiryDate).toISOString();
      }

      await axiosInstance.post(`/api/products/${id}/add-batch`, payload);
      toast({ title: "Batch added", status: "success", duration: 3000 });
      resetBatchForm();
      onClose();
      await loadProduct();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: "Failed to add batch",
        description: msg ?? "Please try again",
        status: "error",
        duration: 3000,
      });
    }
  };

  const getStoreName = (store: Store | string) =>
    typeof store === "object" && store?.name ? sanitizeText(store.name) : "—";
  const getVariantLabel = (variantIdStr: string) => {
    const v = variantOptions.find((x) => x._id === variantIdStr);
    return v ? `${v.value} ${sanitizeText(v.unit)}` : "—";
  };

  if (loading || !product) {
    return (
      <Box bg="gray.100" minH="100vh">
        <Sidebar />
        <Header />
        <Box ml="260px" mt="70px" p={8}>
          <Text>Loading...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Button
          leftIcon={<ArrowBackIcon />}
          variant="ghost"
          mb={4}
          onClick={() => navigate("/products")}
        >
          Back to Products
        </Button>

        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="flex-start" spacing={0}>
            <Heading size="lg">{sanitizeText(product.name)}</Heading>
            <Text color="gray.600">
              {sanitizeText(product.category?.name)}
            </Text>
            <HStack mt={2} spacing={3}>
              <Badge colorScheme={isFixed ? "gray" : "blue"}>
                {isFixed ? "Fixed" : pricingMode === "custom-weight" ? "Custom weight" : "Unit"}
              </Badge>
              {!isFixed && (
                <Text fontSize="sm" color="gray.600">
                  ₹{product.pricePerUnit ?? "—"} / {sanitizeText(product.baseUnit ?? "—")}
                </Text>
              )}
              {hasExpiry && (
                <Badge colorScheme="orange" variant="outline">Has expiry</Badge>
              )}
            </HStack>
          </VStack>
          <Button leftIcon={<AddIcon />} colorScheme="orange" onClick={onOpen}>
            Add Batch
          </Button>
        </Flex>

        <Box bg="white" rounded="lg" shadow="sm" p={5} mb={6}>
          <Heading size="sm" mb={3} color="gray.700">
            Batches
          </Heading>
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Store</Th>
                {isFixed ? <Th>Variant</Th> : null}
                <Th isNumeric>Quantity ({sanitizeText(baseUnit)})</Th>
                {hasExpiry ? <Th>Expiry date</Th> : null}
                {hasExpiry ? <Th>Status</Th> : null}
              </Tr>
            </Thead>
            <Tbody>
              {batches.length === 0 ? (
                <Tr>
                  <Td colSpan={2 + (isFixed ? 1 : 0) + (hasExpiry ? 2 : 0)} textAlign="center" py={8}>
                    <Text color="gray.500">No batches yet. Add a batch to manage inventory.</Text>
                  </Td>
                </Tr>
              ) : (
                batches.map((b) => {
                  const status = b.expiryDate ? getBatchStatus(b.expiryDate) : null;
                  return (
                    <Tr key={b._id} _hover={{ bg: "gray.50" }}>
                      <Td>{getStoreName(b.store)}</Td>
                      {isFixed ? (
                        <Td>{b.variant ? getVariantLabel(b.variant) : "—"}</Td>
                      ) : null}
                      <Td isNumeric fontWeight="medium">
                        {b.quantity}
                      </Td>
                      {hasExpiry ? (
                        <Td>{b.expiryDate ? formatDate(b.expiryDate) : "—"}</Td>
                      ) : null}
                      {hasExpiry ? (
                        <Td>
                          {status ? (
                            <Badge
                              colorScheme={
                                status === "Expired"
                                  ? "red"
                                  : status === "Expiring Soon"
                                    ? "orange"
                                    : "green"
                              }
                            >
                              {status}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </Td>
                      ) : null}
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Batch</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Store</FormLabel>
                <Select
                  placeholder="Select store"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                >
                  {stores.map((s) => (
                    <option key={s._id} value={s._id}>
                      {sanitizeText(s.name)}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {isFixed && (
                <FormControl isRequired>
                  <FormLabel>Variant</FormLabel>
                  <Select
                    placeholder="Select variant"
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value)}
                  >
                    {variantOptions.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.value} {sanitizeText(v.unit)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl isRequired>
                <FormLabel>Quantity (in {sanitizeText(baseUnit)})</FormLabel>
                <Input
                  type="number"
                  min={isPcs ? 1 : 0.001}
                  step={isPcs ? 1 : 0.01}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={isPcs ? "0" : "0.00"}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {isPcs ? "Whole numbers only (pieces)." : "Decimals allowed."}
                </Text>
              </FormControl>

              {hasExpiry && (
                <>
                  <FormControl isRequired>
                    <FormLabel>Manufacturing date</FormLabel>
                    <Input
                      type="date"
                      value={manufacturingDate}
                      onChange={(e) => setManufacturingDate(e.target.value)}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Expiry date</FormLabel>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Must be after manufacturing date.
                      {product.shelfLifeDays
                        ? ` Shelf life ${product.shelfLifeDays} days — expiry suggested from manufacturing date.`
                        : ""}
                    </Text>
                  </FormControl>
                </>
              )}

              <FormControl isRequired>
                <FormLabel>Batch number</FormLabel>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-001"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Cost price (₹)</FormLabel>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Optional"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="orange" onClick={handleAddBatch}>
              Add Batch
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
