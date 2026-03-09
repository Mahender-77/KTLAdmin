import {
  Box,
  Button,
  Heading,
  Input,
  Select,
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
  FormHelperText,
  IconButton,
  Badge,
  Flex,
  Text,
  InputGroup,
  InputLeftElement,
  Switch,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
  Progress,
  Tag,
  TagLabel,
  TagCloseButton,
  Tooltip,
  Alert,
  AlertIcon,
  AlertDescription,
  Grid,
  GridItem,
  Radio,
  RadioGroup,
  Stack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Image,
  Wrap,
  WrapItem,
  Center,
  Icon,
} from "@chakra-ui/react";
import {
  AddIcon,
  SearchIcon,
  DeleteIcon,
  EditIcon,
  InfoOutlineIcon,
  CheckIcon,
  WarningIcon,
  AttachmentIcon,
} from "@chakra-ui/icons";
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Category {
  _id: string;
  name: string;
  slug: string;
  parent?: string | null;
  children?: Category[];
  isActive: boolean;
}

interface Store {
  _id: string;
  name: string;
}

interface Variant {
  _id?: string;
  type: "weight" | "pieces" | "box";
  value: number;
  unit: string;
  price: number;
  offerPrice?: number;
  sku?: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: Category;
  pricingMode?: "unit" | "custom-weight" | "fixed";
  baseUnit?: string;
  pricePerUnit?: number;
  hasExpiry?: boolean;
  shelfLifeDays?: number;
  variants: Variant[];
  isActive: boolean;
  images: string[];
  availableQuantity?: number;
  tags?: string[];
  taxRate?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
}

export interface InitialBatchEntry {
  storeId: string;
  quantity: string;
  batchNumber: string;
  costPrice: string;
  mfgDate: string;
  expiryDate: string;
}

const emptyBatchEntry = (): InitialBatchEntry => ({
  storeId: "",
  quantity: "",
  batchNumber: "",
  costPrice: "",
  mfgDate: "",
  expiryDate: "",
});

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_UNITS = ["kg", "g", "ml", "l", "pcs"] as const;

const PRICING_MODE_OPTIONS = [
  {
    value: "unit",
    label: "Unit (per piece)",
    icon: "🎯",
    desc: "Fixed price per piece. Customer buys whole units. Best for watches, gifts, packaged goods.",
  },
  {
    value: "custom-weight",
    label: "Custom Weight",
    icon: "⚖️",
    desc: "Price per base unit. Customer chooses any quantity. Best for ginger, fruits, liquids.",
  },
  {
    value: "fixed",
    label: "Fixed Variants",
    icon: "📦",
    desc: "Pre-defined packs at specific prices. Best for 250g / 500g / 1kg packs.",
  },
] as const;

const PRODUCT_TYPE_PRESETS = [
  { label: "🥬 Vegetable/Fruit", pricingMode: "custom-weight", baseUnit: "kg", hasExpiry: true, shelfLifeDays: 7 },
  { label: "🥛 Liquid", pricingMode: "custom-weight", baseUnit: "l", hasExpiry: true, shelfLifeDays: 5 },
  { label: "📦 Packaged Good", pricingMode: "fixed", baseUnit: "pcs", hasExpiry: true, shelfLifeDays: 180 },
  { label: "⌚ Non-perishable", pricingMode: "unit", baseUnit: "pcs", hasExpiry: false },
  { label: "🌾 Grain/Pulse", pricingMode: "custom-weight", baseUnit: "kg", hasExpiry: true, shelfLifeDays: 365 },
];

const STEPS = [
  { title: "Basic Info", description: "Name, category, description" },
  { title: "Pricing & Units", description: "How this product is priced" },
  { title: "Variants", description: "Fixed packs (optional)" },
  { title: "Initial Stock", description: "First batch entry" },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

const flattenCategories = (cats: Category[], result: Category[] = []): Category[] => {
  cats.forEach((cat) => {
    result.push(cat);
    if (cat.children?.length) flattenCategories(cat.children, result);
  });
  return result;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface PricingCardProps {
  option: (typeof PRICING_MODE_OPTIONS)[number];
  selected: boolean;
  onClick: () => void;
}
const PricingCard = ({ option, selected, onClick }: PricingCardProps) => (
  <Box
    as="button"
    type="button"
    onClick={onClick}
    w="full"
    p={4}
    border="2px solid"
    borderColor={selected ? "orange.400" : "gray.200"}
    bg={selected ? "orange.50" : "white"}
    borderRadius="lg"
    textAlign="left"
    transition="all 0.15s"
    _hover={{ borderColor: "orange.300", bg: "orange.50" }}
    cursor="pointer"
  >
    <HStack spacing={3}>
      <Text fontSize="xl">{option.icon}</Text>
      <Box flex={1}>
        <Text fontWeight="semibold" fontSize="sm" color={selected ? "orange.700" : "gray.700"}>
          {option.label}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={0.5}>
          {option.desc}
        </Text>
      </Box>
      {selected && <CheckIcon color="orange.500" />}
    </HStack>
  </Box>
);

// ─── Variant Row ─────────────────────────────────────────────────────────────

interface VariantRowProps {
  variant: Variant;
  index: number;
  onChange: (i: number, field: keyof Variant, val: string | number) => void;
  onRemove: (i: number) => void;
}
const VariantRow = ({ variant, index, onChange, onRemove }: VariantRowProps) => (
  <Box p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
    <Flex justify="space-between" mb={2}>
      <Text fontSize="xs" fontWeight="bold" color="gray.600">
        VARIANT {index + 1}
      </Text>
      <IconButton
        aria-label="Remove variant"
        icon={<DeleteIcon />}
        size="xs"
        variant="ghost"
        colorScheme="red"
        onClick={() => onRemove(index)}
      />
    </Flex>
    <Grid templateColumns="repeat(2, 1fr)" gap={2}>
      <FormControl>
        <FormLabel fontSize="xs">Type</FormLabel>
        <Select size="sm" value={variant.type} onChange={(e) => onChange(index, "type", e.target.value)}>
          <option value="weight">Weight</option>
          <option value="pieces">Pieces</option>
          <option value="box">Box</option>
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel fontSize="xs">Unit</FormLabel>
        <Select size="sm" value={variant.unit} onChange={(e) => onChange(index, "unit", e.target.value)}>
          {["g", "kg", "ml", "l", "pcs", "box"].map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel fontSize="xs">Value (qty in unit)</FormLabel>
        <NumberInput size="sm" value={variant.value} min={0} onChange={(_, v) => onChange(index, "value", v)}>
          <NumberInputField />
          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel fontSize="xs">Price (₹)</FormLabel>
        <NumberInput size="sm" value={variant.price} min={0} onChange={(_, v) => onChange(index, "price", v)}>
          <NumberInputField />
          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel fontSize="xs">Offer Price (₹, optional)</FormLabel>
        <NumberInput size="sm" value={variant.offerPrice ?? 0} min={0} onChange={(_, v) => onChange(index, "offerPrice", v)}>
          <NumberInputField />
          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl>
        <FormLabel fontSize="xs">SKU (optional)</FormLabel>
        <Input size="sm" value={variant.sku ?? ""} placeholder="e.g. SKU-001" onChange={(e) => onChange(index, "sku", e.target.value)} />
      </FormControl>
    </Grid>
  </Box>
);

// ─── Initial Batch Form ───────────────────────────────────────────────────────

interface BatchFormProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  stores: Store[];
  batches: InitialBatchEntry[];
  onBatchChange: (index: number, field: keyof InitialBatchEntry, value: string) => void;
  hasExpiry: boolean;
  baseUnit: string;
  pricingMode: string;
  variants: Variant[];
}

const BatchForm = (p: BatchFormProps) => {
  const renderBatchFields = (batch: InitialBatchEntry, index: number, variantLabel?: string) => (
    <VStack key={index} spacing={4} p={4} bg="orange.50" borderRadius="lg" border="1px solid" borderColor="orange.200" align="stretch">
      {variantLabel && (
        <Text fontSize="sm" fontWeight="bold" color="orange.700">
          📦 {variantLabel}
        </Text>
      )}
      {!variantLabel && index === 0 && (
        <Text fontSize="sm" fontWeight="bold" color="orange.700">📦 Batch Details</Text>
      )}
      <Grid templateColumns="repeat(2, 1fr)" gap={3}>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Store</FormLabel>
          <Select size="sm" placeholder="Select store" value={batch.storeId} onChange={(e) => p.onBatchChange(index, "storeId", e.target.value)}>
            {p.stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Quantity (in {p.baseUnit})</FormLabel>
          <Input
            size="sm"
            type="number"
            min={p.baseUnit === "pcs" ? 1 : 0.01}
            step={p.baseUnit === "pcs" ? 1 : 0.01}
            placeholder={p.baseUnit === "pcs" ? "e.g. 100" : "e.g. 25.5"}
            value={batch.quantity}
            onChange={(e) => p.onBatchChange(index, "quantity", e.target.value)}
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Batch Number</FormLabel>
          <Input size="sm" placeholder="e.g. BATCH-001" value={batch.batchNumber} onChange={(e) => p.onBatchChange(index, "batchNumber", e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Cost Price (₹, optional)</FormLabel>
          <Input size="sm" type="number" min={0} step={0.01} placeholder="e.g. 80" value={batch.costPrice} onChange={(e) => p.onBatchChange(index, "costPrice", e.target.value)} />
          <FormHelperText fontSize="xs">Used for margin analytics</FormHelperText>
        </FormControl>
      </Grid>
      {p.hasExpiry && (
        <Grid templateColumns="repeat(2, 1fr)" gap={3}>
          <FormControl isRequired>
            <FormLabel fontSize="sm">Manufacturing Date</FormLabel>
            <Input size="sm" type="date" value={batch.mfgDate} onChange={(e) => p.onBatchChange(index, "mfgDate", e.target.value)} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel fontSize="sm">Expiry Date</FormLabel>
            <Input size="sm" type="date" value={batch.expiryDate} onChange={(e) => p.onBatchChange(index, "expiryDate", e.target.value)} />
            <FormHelperText fontSize="xs">Must be after manufacturing date</FormHelperText>
          </FormControl>
        </Grid>
      )}
      {p.hasExpiry && batch.mfgDate && batch.expiryDate && new Date(batch.expiryDate) <= new Date(batch.mfgDate) && (
        <Alert status="error" size="sm" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="xs">Expiry date must be after manufacturing date.</AlertDescription>
        </Alert>
      )}
    </VStack>
  );

  return (
    <Box>
      <FormControl display="flex" alignItems="center" mb={4}>
        <FormLabel mb={0} fontWeight="semibold">Add initial stock batch{p.batches.length > 1 ? "es" : ""}?</FormLabel>
        <Switch isChecked={p.enabled} onChange={(e) => p.onToggle(e.target.checked)} colorScheme="orange" />
        <Text ml={2} fontSize="sm" color="gray.500">{p.enabled ? (p.batches.length > 1 ? `Yes (${p.batches.length} variants)` : "Yes") : "Skip for now"}</Text>
      </FormControl>

      {p.enabled && (
        <VStack spacing={4} align="stretch">
          {p.pricingMode === "fixed" && p.variants.length > 0
            ? p.batches.map((batch, i) => renderBatchFields(batch, i, `Variant ${i + 1}: ${p.variants[i]?.value}${p.variants[i]?.unit} @ ₹${p.variants[i]?.price ?? "—"}`))
            : p.batches.map((batch, i) => renderBatchFields(batch, i))}
        </VStack>
      )}
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Products() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // ── Data ──
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPricingMode, setFilterPricingMode] = useState("all");

  // ── Stepper ──
  const { activeStep, setActiveStep } = useSteps({ index: 0, count: STEPS.length });

  // ── Step 1: Basic Info ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Step 2: Pricing & Units ──
  const [pricingMode, setPricingMode] = useState<"unit" | "custom-weight" | "fixed">("unit");
  const [baseUnit, setBaseUnit] = useState<string>("pcs");
  const [pricePerUnit, setPricePerUnit] = useState<string>("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [shelfLifeDays, setShelfLifeDays] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("");
  const [minOrderQty, setMinOrderQty] = useState<string>("");
  const [maxOrderQty, setMaxOrderQty] = useState<string>("");

  // ── Step 3: Variants ──
  const [variants, setVariants] = useState<Variant[]>([]);

  // ── Step 4: Initial Stock (one entry per variant for fixed, one for unit/custom-weight) ──
  const [addInitialStock, setAddInitialStock] = useState(false);
  const [initialBatches, setInitialBatches] = useState<InitialBatchEntry[]>([emptyBatchEntry()]);

  // ── Edit mode ──
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // ── Derived ──
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const parent = flatCategories.find((c) => c._id === selectedCategory);
    return parent?.children ?? [];
  }, [selectedCategory, flatCategories]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchQuery) list = list.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterCategory) list = list.filter((p) => p.category._id === filterCategory);
    if (filterStatus !== "all") list = list.filter((p) => p.isActive === (filterStatus === "active"));
    if (filterPricingMode !== "all") list = list.filter((p) => p.pricingMode === filterPricingMode);
    return list;
  }, [searchQuery, filterCategory, filterStatus, filterPricingMode, products]);

  // Keep initialBatches length in sync: one per variant for fixed, one for unit/custom-weight
  useEffect(() => {
    const targetLength = pricingMode === "fixed" && variants.length > 0 ? variants.length : 1;
    setInitialBatches((prev) => {
      if (prev.length === targetLength) return prev;
      const next = Array.from({ length: targetLength }, (_, i) => prev[i] ?? emptyBatchEntry());
      return next;
    });
  }, [pricingMode, variants.length]);

  // ── Load ──
  const loadData = async () => {
    const [productRes, categoryRes] = await Promise.all([
      axiosInstance.get("/api/products"),
      axiosInstance.get("/api/categories"),
    ]);
    setProducts(productRes.data?.data ?? []);
    setCategories(categoryRes.data ?? []);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [productRes, categoryRes, storesRes] = await Promise.all([
          axiosInstance.get("/api/products"),
          axiosInstance.get("/api/categories"),
          axiosInstance.get("/api/stores").catch(() => ({ data: { data: [] } })),
        ]);
        if (!mounted) return;
        setProducts(productRes.data?.data ?? []);
        setCategories(categoryRes.data ?? []);
        setStores(storesRes.data?.data ?? []);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Reset ──
  const resetForm = () => {
    setActiveStep(0);
    setEditingProductId(null);
    setName(""); setDescription(""); setSelectedCategory(""); setSelectedSubCategory("");
    setTags([]); setTagInput(""); setImage(null); setImagePreview(null);
    setPricingMode("unit"); setBaseUnit("pcs"); setPricePerUnit(""); setHasExpiry(false);
    setShelfLifeDays(""); setTaxRate(""); setMinOrderQty(""); setMaxOrderQty("");
    setVariants([]);
    setAddInitialStock(false);
    setInitialBatches([emptyBatchEntry()]);
  };

  const handleClose = () => { resetForm(); onClose(); };

  // ── Apply Preset ──
  const applyPreset = (preset: typeof PRODUCT_TYPE_PRESETS[0]) => {
    setPricingMode(preset.pricingMode as any);
    setBaseUnit(preset.baseUnit);
    setHasExpiry(preset.hasExpiry);
    setShelfLifeDays(preset.shelfLifeDays ? String(preset.shelfLifeDays) : "");
    if (preset.pricingMode === "fixed") setVariants([{ type: "weight", value: 0, unit: "g", price: 0 }]);
    else setVariants([]);
  };

  // ── Variant helpers ──
  const addVariant = () => setVariants((v) => [...v, { type: "weight", value: 0, unit: "g", price: 0 }]);
  const removeVariant = (i: number) => setVariants((v) => v.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, field: keyof Variant, val: string | number) =>
    setVariants((v) => v.map((vv, idx) => (idx === i ? { ...vv, [field]: val } : vv)));

  const updateInitialBatch = (index: number, field: keyof InitialBatchEntry, value: string) =>
    setInitialBatches((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));

  // ── Validation per step ──
  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!name.trim()) return "Product name is required.";
      if (!selectedCategory) return "Please select a category.";
    }
    if (step === 1) {
      if (!pricePerUnit || isNaN(Number(pricePerUnit)) || Number(pricePerUnit) < 0)
        return "Enter a valid price per unit (≥ 0).";
      if (minOrderQty && maxOrderQty && Number(minOrderQty) > Number(maxOrderQty))
        return "Min order qty cannot exceed max order qty.";
    }
    if (step === 2) {
      if (pricingMode === "fixed" && variants.length === 0)
        return "Add at least one variant for Fixed Variants pricing.";
      for (const v of variants) {
        if (!v.value || v.value <= 0) return "All variants need a value > 0.";
        if (!v.price || v.price <= 0) return "All variants need a price > 0.";
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(activeStep);
    if (err) { toast({ title: "Validation", description: err, status: "warning", duration: 3000 }); return; }
    setActiveStep(activeStep + 1);
  };

  // ── Create / Update ──
  const handleCreate = async () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      const err = validateStep(i);
      if (err) { toast({ title: "Validation", description: err, status: "warning", duration: 3000 }); setActiveStep(i); return; }
    }

    const categoryId = selectedSubCategory || selectedCategory;
    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description || "");
    fd.append("category", categoryId);
    fd.append("pricingMode", pricingMode);
    fd.append("baseUnit", baseUnit);
    fd.append("pricePerUnit", String(Number(pricePerUnit)));
    fd.append("hasExpiry", hasExpiry ? "true" : "false");
    if (tags.length) fd.append("tags", JSON.stringify(tags));
    if (taxRate) fd.append("taxRate", taxRate);
    if (minOrderQty) fd.append("minOrderQty", minOrderQty);
    if (maxOrderQty) fd.append("maxOrderQty", maxOrderQty);
    if (hasExpiry && shelfLifeDays && Number(shelfLifeDays) > 0) fd.append("shelfLifeDays", shelfLifeDays);
    fd.append("variants", JSON.stringify(pricingMode === "fixed" ? variants : []));
    if (image) fd.append("image", image);

    try {
      if (editingProductId) {
        await axiosInstance.patch(`/api/products/${editingProductId}`, fd);
        toast({ title: "✅ Product updated successfully!", status: "success", duration: 3000 });
        handleClose();
        await loadData();
        return;
      }

      const { data: created } = await axiosInstance.post("/api/products", fd);

      // Initial batches: one per variant for fixed, one for unit/custom-weight
      if (addInitialStock && initialBatches.length > 0) {
        let batchErrors = 0;
        for (let i = 0; i < initialBatches.length; i++) {
          const b = initialBatches[i];
          if (!b.storeId?.trim() || !b.batchNumber?.trim() || !b.quantity) continue;
          const qty = baseUnit === "pcs" ? Math.floor(Number(b.quantity)) : Number(b.quantity);
          if (qty <= 0) continue;
          const payload: Record<string, unknown> = {
            store: b.storeId,
            quantity: qty,
            batchNumber: b.batchNumber.trim(),
          };
          if (b.costPrice) payload.costPrice = Number(b.costPrice);
          if (hasExpiry && b.mfgDate && b.expiryDate && new Date(b.expiryDate) > new Date(b.mfgDate)) {
            payload.manufacturingDate = new Date(b.mfgDate).toISOString();
            payload.expiryDate = new Date(b.expiryDate).toISOString();
          }
          if (pricingMode === "fixed" && created.variants?.[i]?._id) {
            payload.variant = created.variants[i]._id;
          }
          try {
            await axiosInstance.post(`/api/products/${created._id}/add-batch`, payload);
          } catch (e) {
            console.error("Batch error:", e);
            batchErrors++;
          }
        }
        if (batchErrors > 0) {
          toast({ title: "Product created", description: `Could not add ${batchErrors} batch(es). Add from product detail.`, status: "warning", duration: 5000 });
        }
      }

      toast({ title: "✅ Product created successfully!", status: "success", duration: 3000 });
      handleClose();
      await loadData();
    } catch (e) {
      console.error(e);
      toast({ title: "Error creating product", status: "error", duration: 3000 });
    }
  };

  const handleEdit = async (product: Product) => {
    try {
      setLoadingEdit(true);
      const res = await axiosInstance.get(`/api/products/${product._id}`);
      const p = res.data;
      const catId = typeof p.category === "object" && p.category?._id ? p.category._id : p.category;
      const parentCat = flatCategories.find((c) => c.children?.some((ch: Category) => ch._id === catId));
      const isSub = !!parentCat?.children?.some((ch: Category) => ch._id === catId);
      setName(p.name ?? "");
      setDescription(p.description ?? "");
      setSelectedCategory(parentCat ? parentCat._id : (catId ?? ""));
      setSelectedSubCategory(isSub ? (catId ?? "") : "");
      setTags(Array.isArray(p.tags) ? p.tags : []);
      setTagInput("");
      setImage(null);
      setImagePreview(p.images?.[0] ?? null);
      setPricingMode((p.pricingMode ?? "unit") as any);
      setBaseUnit(p.baseUnit ?? "pcs");
      setPricePerUnit(String(p.pricePerUnit ?? ""));
      setHasExpiry(p.hasExpiry ?? false);
      setShelfLifeDays(p.shelfLifeDays != null ? String(p.shelfLifeDays) : "");
      setTaxRate(p.taxRate != null ? String(p.taxRate) : "");
      setMinOrderQty(p.minOrderQty != null ? String(p.minOrderQty) : "");
      setMaxOrderQty(p.maxOrderQty != null ? String(p.maxOrderQty) : "");
      setVariants(Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : []);
      setAddInitialStock(false);
      setInitialBatches([emptyBatchEntry()]);
      setEditingProductId(product._id);
      setActiveStep(0);
      onOpen();
    } catch (e) {
      console.error(e);
      toast({ title: "Error loading product", status: "error", duration: 3000 });
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axiosInstance.delete(`/api/products/${id}`);
      toast({ title: "Product deleted", status: "success", duration: 3000 });
      await loadData();
    } catch (e) {
      toast({ title: "Error deleting product", status: "error", duration: 3000 });
    }
  };

  const resetFilters = () => { setSearchQuery(""); setFilterCategory(""); setFilterStatus("all"); setFilterPricingMode("all"); };

  // ── Render step content ──
  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <VStack spacing={4} align="stretch">
            {/* Quick presets */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase" letterSpacing="wide">
                Quick Product Presets
              </Text>
              <Wrap spacing={2}>
                {PRODUCT_TYPE_PRESETS.map((p) => (
                  <WrapItem key={p.label}>
                    <Button size="xs" variant="outline" colorScheme="orange" onClick={() => applyPreset(p)}>
                      {p.label}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
              <Text fontSize="xs" color="gray.400" mt={1}>Presets auto-fill pricing & unit settings on Step 2</Text>
            </Box>

            <Divider />

            <FormControl isRequired>
              <FormLabel>Product Name</FormLabel>
              <Input placeholder="e.g. Fresh Ginger" value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="Describe the product..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                resize="vertical"
              />
            </FormControl>

            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired>
                <FormLabel>Parent Category</FormLabel>
                <Select
                  placeholder="Select category"
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory(""); }}
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </Select>
              </FormControl>

              {subCategories.length > 0 && (
                <FormControl>
                  <FormLabel>Sub Category</FormLabel>
                  <Select
                    placeholder="Select sub-category (optional)"
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                  >
                    {subCategories.map((sc) => (
                      <option key={sc._id} value={sc._id}>{sc.name}</option>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            {/* Tags */}
            <FormControl>
              <FormLabel>Tags <Text as="span" fontSize="xs" color="gray.400" fontWeight="normal">(optional — for search/filter)</Text></FormLabel>
              <HStack>
                <Input
                  placeholder="e.g. organic, imported, seasonal"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                      e.preventDefault();
                      const t = tagInput.trim().replace(/,$/, "");
                      if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
                      setTagInput("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  colorScheme="orange"
                  variant="outline"
                  onClick={() => {
                    const t = tagInput.trim();
                    if (t && !tags.includes(t)) { setTags((prev) => [...prev, t]); setTagInput(""); }
                  }}
                >
                  Add
                </Button>
              </HStack>
              {tags.length > 0 && (
                <Wrap mt={2} spacing={1}>
                  {tags.map((tag) => (
                    <WrapItem key={tag}>
                      <Tag size="sm" colorScheme="orange" borderRadius="full">
                        <TagLabel>{tag}</TagLabel>
                        <TagCloseButton onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              )}
            </FormControl>

            {/* Image */}
            <FormControl>
              <FormLabel>Product Image</FormLabel>
              <Flex gap={4} align="center">
                {imagePreview ? (
                  <Box position="relative">
                    <Image src={imagePreview} boxSize="80px" objectFit="cover" borderRadius="lg" border="2px solid" borderColor="orange.200" />
                    <IconButton
                      aria-label="Remove image"
                      icon={<DeleteIcon />}
                      size="xs"
                      position="absolute"
                      top={-2}
                      right={-2}
                      colorScheme="red"
                      borderRadius="full"
                      onClick={() => { setImage(null); setImagePreview(null); }}
                    />
                  </Box>
                ) : (
                  <Center
                    boxSize="80px"
                    border="2px dashed"
                    borderColor="gray.300"
                    borderRadius="lg"
                    cursor="pointer"
                    _hover={{ borderColor: "orange.400", bg: "orange.50" }}
                    onClick={() => fileRef.current?.click()}
                    flexDirection="column"
                    gap={1}
                  >
                    <AttachmentIcon color="gray.400" />
                    <Text fontSize="9px" color="gray.400">Upload</Text>
                  </Center>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImage(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
                {!imagePreview && (
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    Choose Image
                  </Button>
                )}
              </Flex>
            </FormControl>
          </VStack>
        );

      case 1:
        return (
          <VStack spacing={5} align="stretch">
            {/* Pricing Mode Cards */}
            <FormControl isRequired>
              <FormLabel fontWeight="semibold">Pricing Mode</FormLabel>
              <VStack spacing={2}>
                {PRICING_MODE_OPTIONS.map((opt) => (
                  <PricingCard
                    key={opt.value}
                    option={opt}
                    selected={pricingMode === opt.value}
                    onClick={() => {
                      setPricingMode(opt.value as any);
                      if (opt.value === "fixed") setVariants([{ type: "weight", value: 0, unit: "g", price: 0 }]);
                      else setVariants([]);
                    }}
                  />
                ))}
              </VStack>
            </FormControl>

            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired>
                <FormLabel>Base Unit
                  <Tooltip label="The smallest unit in which stock is counted. e.g. kg for ginger, pcs for watches.">
                    <InfoOutlineIcon ml={1} boxSize={3} color="gray.400" />
                  </Tooltip>
                </FormLabel>
                <Select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}>
                  {BASE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Price per {baseUnit} (₹)</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" color="gray.400" fontSize="sm">₹</InputLeftElement>
                  <Input
                    pl={8}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="e.g. 100"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                  />
                </InputGroup>
              </FormControl>
            </Grid>

            {/* Expiry */}
            <Box p={4} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
              <FormControl display="flex" alignItems="center" mb={hasExpiry ? 3 : 0}>
                <FormLabel mb={0} fontWeight="semibold">Has Expiry Date?</FormLabel>
                <Switch isChecked={hasExpiry} onChange={(e) => setHasExpiry(e.target.checked)} colorScheme="orange" />
                <Badge ml={2} colorScheme={hasExpiry ? "red" : "gray"}>{hasExpiry ? "Perishable" : "Non-perishable"}</Badge>
              </FormControl>
              {hasExpiry && (
                <FormControl>
                  <FormLabel fontSize="sm">Shelf Life (days, optional hint)</FormLabel>
                  <NumberInput value={shelfLifeDays} min={1} max={3650} onChange={(v) => setShelfLifeDays(v)}>
                    <NumberInputField placeholder="e.g. 30 for ginger, 7 for milk" />
                    <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                  </NumberInput>
                  <FormHelperText>Used to auto-suggest expiry date when adding batches. Does not auto-set expiry.</FormHelperText>
                </FormControl>
              )}
            </Box>

            {/* Advanced settings */}
            <Accordion allowToggle>
              <AccordionItem border="1px solid" borderColor="gray.200" borderRadius="lg">
                <AccordionButton borderRadius="lg" _expanded={{ bg: "gray.50" }}>
                  <Box flex={1} textAlign="left" fontSize="sm" fontWeight="medium">Advanced Settings (tax, order limits)</Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                    <FormControl>
                      <FormLabel fontSize="sm">Tax Rate (%)</FormLabel>
                      <NumberInput value={taxRate} min={0} max={100} onChange={(v) => setTaxRate(v)}>
                        <NumberInputField placeholder="e.g. 18" />
                        <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                      </NumberInput>
                      <FormHelperText fontSize="xs">GST/VAT %</FormHelperText>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Min Order ({baseUnit})</FormLabel>
                      <NumberInput value={minOrderQty} min={0} onChange={(v) => setMinOrderQty(v)}>
                        <NumberInputField placeholder="e.g. 0.25" />
                        <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Max Order ({baseUnit})</FormLabel>
                      <NumberInput value={maxOrderQty} min={0} onChange={(v) => setMaxOrderQty(v)}>
                        <NumberInputField placeholder="e.g. 50" />
                        <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  </Grid>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        );

      case 2:
        return (
          <VStack spacing={4} align="stretch">
            {pricingMode !== "fixed" ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  <strong>Variants are only used with Fixed Variants pricing.</strong><br />
                  Your current mode <Badge colorScheme="blue" mx={1}>{pricingMode}</Badge> uses <strong>pricePerUnit × quantity</strong>.
                  You can skip this step.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm">Fixed Variants</Text>
                    <Text fontSize="xs" color="gray.500">Define specific pack sizes with individual prices (e.g. 250g @ ₹45, 500g @ ₹85)</Text>
                  </Box>
                  <Button leftIcon={<AddIcon />} size="sm" colorScheme="orange" onClick={addVariant}>
                    Add Variant
                  </Button>
                </Flex>

                {variants.length === 0 ? (
                  <Center py={8} flexDirection="column" gap={2} color="gray.400" border="2px dashed" borderColor="gray.200" borderRadius="lg">
                    <Text fontSize="sm">No variants yet</Text>
                    <Button size="sm" colorScheme="orange" variant="ghost" onClick={addVariant}>+ Add first variant</Button>
                  </Center>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {variants.map((v, i) => (
                      <VariantRow key={i} variant={v} index={i} onChange={updateVariant} onRemove={removeVariant} />
                    ))}
                  </VStack>
                )}
              </>
            )}
          </VStack>
        );

      case 3:
        return (
          <BatchForm
            enabled={addInitialStock}
            onToggle={setAddInitialStock}
            stores={stores}
            batches={initialBatches}
            onBatchChange={updateInitialBatch}
            hasExpiry={hasExpiry}
            baseUnit={baseUnit}
            pricingMode={pricingMode}
            variants={variants}
          />
        );

      default:
        return null;
    }
  };

  const progress = ((activeStep) / (STEPS.length - 1)) * 100;

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg">Product Inventory</Heading>
            <Text fontSize="sm" color="gray.500" mt={0.5}>
              {products.length} products across all categories
            </Text>
          </Box>
          <Button leftIcon={<AddIcon />} colorScheme="orange" onClick={onOpen} size="md">
            Add Product
          </Button>
        </Flex>

        {/* Filters */}
        <Box bg="white" p={5} rounded="lg" shadow="sm" mb={6}>
          <HStack spacing={3} flexWrap="wrap" mb={3}>
            <InputGroup maxW="280px">
              <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
              <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} bg="gray.50" border="none" _focus={{ bg: "white", boxShadow: "sm" }} />
            </InputGroup>

            <Select placeholder="All Categories" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} maxW="220px" bg="gray.50" border="none">
              {flatCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>

            <Select value={filterPricingMode} onChange={(e) => setFilterPricingMode(e.target.value)} maxW="180px" bg="gray.50" border="none">
              <option value="all">All Pricing</option>
              <option value="unit">Unit</option>
              <option value="custom-weight">Custom Weight</option>
              <option value="fixed">Fixed Variants</option>
            </Select>

            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} maxW="140px" bg="gray.50" border="none">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>

            <Button variant="outline" onClick={resetFilters} borderColor="gray.300" size="md">Reset</Button>
          </HStack>
          <Text fontSize="sm" color="gray.500">Showing <strong>{filteredProducts.length}</strong> of {products.length} products</Text>
        </Box>

        {/* Products Table */}
        <Box bg="white" rounded="lg" shadow="sm" overflow="hidden">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Pricing Mode</Th>
                <Th>Price / Unit</Th>
                <Th isNumeric>Stock</Th>
                <Th>Expiry</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProducts.length === 0 ? (
                <Tr>
                  <Td colSpan={8} textAlign="center" py={10}>
                    <Text color="gray.400">No products found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredProducts.map((product) => {
                  const mode = product.pricingMode ?? "unit";
                  const isUnitOrWeight = mode === "unit" || mode === "custom-weight";
                  return (
                    <Tr key={product._id} _hover={{ bg: "gray.50" }}>
                      <Td>
                        <Text fontWeight="medium">{product.name}</Text>
                        {product.tags?.length ? (
                          <HStack mt={1} spacing={1} flexWrap="wrap">
                            {product.tags.slice(0, 3).map((t) => (
                              <Tag key={t} size="sm" colorScheme="gray" borderRadius="full"><TagLabel fontSize="10px">{t}</TagLabel></Tag>
                            ))}
                          </HStack>
                        ) : null}
                      </Td>
                      <Td color="gray.600" fontSize="sm">{product.category?.name || "N/A"}</Td>
                      <Td>
                        <Badge colorScheme={mode === "fixed" ? "purple" : mode === "custom-weight" ? "blue" : "teal"}>
                          {mode === "unit" ? "Unit" : mode === "custom-weight" ? "Custom Weight" : "Fixed"}
                        </Badge>
                      </Td>
                      <Td>
                        {isUnitOrWeight ? (
                          <Text fontWeight="semibold" fontSize="sm">₹{product.pricePerUnit ?? "—"} / {product.baseUnit ?? "—"}</Text>
                        ) : (
                          <VStack spacing={0} align="flex-start">
                            {(() => {
                              const v0 = product.variants?.[0];
                              const effectivePrice = v0 && (v0.offerPrice != null && v0.offerPrice > 0) ? v0.offerPrice : v0?.price;
                              const showOriginal = v0 && (v0.offerPrice != null && v0.offerPrice > 0 && v0.offerPrice < v0.price);
                              return (
                                <>
                                  {showOriginal && <Text fontSize="xs" color="gray.500" textDecoration="line-through">₹{v0.price}</Text>}
                                  <Text fontWeight="semibold" fontSize="sm">₹{effectivePrice ?? "—"}</Text>
                                  {v0 && (
                                    <Text fontSize="xs" color="gray.400">{v0.value} {v0.unit}</Text>
                                  )}
                                </>
                              );
                            })()}
                          </VStack>
                        )}
                      </Td>
                      <Td isNumeric>
                        <Text fontWeight="medium">{product.availableQuantity != null ? `${product.availableQuantity} ${product.baseUnit}` : "—"}</Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={product.hasExpiry ? "red" : "gray"} variant="subtle">
                          {product.hasExpiry ? `⏱ ${product.shelfLifeDays ? `${product.shelfLifeDays}d` : "Yes"}` : "None"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={product.isActive ? "green" : "gray"}>{product.isActive ? "Active" : "Inactive"}</Badge>
                      </Td>
                      <Td>
                        <HStack>
                          <Button size="sm" variant="outline" colorScheme="orange" onClick={() => navigate(`/products/${product._id}`)}>View</Button>
                          <Tooltip label="Edit product">
                            <IconButton
                              aria-label="Edit product"
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="orange"
                              onClick={() => handleEdit(product)}
                              isLoading={loadingEdit}
                            />
                          </Tooltip>
                          <Tooltip label="Delete product">
                            <IconButton aria-label="Delete" icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red" onClick={() => handleDelete(product._id)} />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* ─── Create Product Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent maxH="90vh">
          <ModalHeader pb={2}>
            <Text>{editingProductId ? "Edit Product" : "Add New Product"}</Text>
            <Text fontSize="sm" fontWeight="normal" color="gray.500">
              Step {activeStep + 1} of {STEPS.length} — {STEPS[activeStep].description}
            </Text>
            <Progress value={progress} size="xs" colorScheme="orange" mt={2} borderRadius="full" />
          </ModalHeader>
          <ModalCloseButton />

          {/* Stepper */}
          <Box px={6} py={3} bg="gray.50" borderTop="1px solid" borderBottom="1px solid" borderColor="gray.100">
            <Stepper index={activeStep} size="sm" colorScheme="orange">
              {STEPS.map((step, index) => (
                <Step key={index}>
                  <StepIndicator>
                    <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />} />
                  </StepIndicator>
                  <Box flexShrink={0}>
                    <StepTitle>{step.title}</StepTitle>
                  </Box>
                  <StepSeparator />
                </Step>
              ))}
            </Stepper>
          </Box>

          <ModalBody py={5}>{renderStep()}</ModalBody>

          <ModalFooter borderTop="1px solid" borderColor="gray.100">
            <HStack w="full" justify="space-between">
              <Button variant="ghost" onClick={activeStep === 0 ? handleClose : () => setActiveStep(activeStep - 1)}>
                {activeStep === 0 ? "Cancel" : "← Back"}
              </Button>
              <HStack>
                {activeStep < STEPS.length - 1 ? (
                  <>
                    {activeStep === 2 && pricingMode !== "fixed" && (
                      <Button variant="ghost" size="sm" color="gray.400" onClick={() => setActiveStep(activeStep + 1)}>Skip</Button>
                    )}
                    <Button colorScheme="orange" onClick={goNext}>Next →</Button>
                  </>
                ) : (
                  <Button colorScheme="orange" onClick={handleCreate} leftIcon={<CheckIcon />}>
                    {editingProductId ? "Update Product" : "Create Product"}
                  </Button>
                )}
              </HStack>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}