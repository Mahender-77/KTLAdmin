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
  IconButton,
  Badge,
  Flex,
  Text,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import { AddIcon, SearchIcon, EditIcon, DeleteIcon } from "@chakra-ui/icons";
import axiosInstance from "../services/axiosInstance";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

interface Category {
  _id: string;
  name: string;
  slug: string;
  parent?: string | null;
  children?: Category[];
  isActive: boolean;
}

interface Variant {
  type: string;
  value: number;
  unit: string;
  price: number;
  offerPrice?: number;
  sku?: string;
  stock: number;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: Category;
  variants: Variant[];
  isActive: boolean;
  images: string[];
}
interface Store {
  _id: string;
  name: string;
}

export default function Products() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Product list and filters
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [value, setValue] = useState<number>(0);
  const [unit, setUnit] = useState("kg");
  const [variantType, setVariantType] = useState("weight");
  const [sku, setSku] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState("");

  // Flatten category tree for easier access
  const flattenCategories = (
    cats: Category[],
    result: Category[] = [],
  ): Category[] => {
    cats.forEach((cat) => {
      result.push(cat);
      if (cat.children && cat.children.length > 0) {
        flattenCategories(cat.children, result);
      }
    });
    return result;
  };

  // Use useMemo to derive flat categories from categories
  const flatCategories = useMemo(() => {
    return flattenCategories(categories);
  }, [categories]);

  // Use useMemo to derive subcategories based on selected parent
  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];

    const parentCat = flatCategories.find(
      (cat) => cat._id === selectedCategory,
    );
    if (parentCat && parentCat.children && parentCat.children.length > 0) {
      return parentCat.children;
    }
    return [];
  }, [selectedCategory, flatCategories]);

  // Use useMemo to derive filtered products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(
        (product) => product.category._id === filterCategory,
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (product) => product.isActive === (filterStatus === "active"),
      );
    }

    return filtered;
  }, [searchQuery, filterCategory, filterStatus, products]);

  const loadData = async () => {
    try {
      const [productRes, categoryRes, storeRes] = await Promise.all([
        axiosInstance.get("/api/products"),
        axiosInstance.get("/api/categories"),
        axiosInstance.get("/api/stores"),
      ]);

      setProducts(productRes.data);
      setCategories(categoryRes.data);
      setStores(storeRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: "Could not fetch products and categories",
        status: "error",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [productRes, storeRes, categoryRes] = await Promise.all([
          axiosInstance.get("/api/products"),
          axiosInstance.get("/api/stores"),
          axiosInstance.get("/api/categories"),
        ]);

        if (mounted) {
          setProducts(productRes.data);
          setStores(storeRes.data);
          setCategories(categoryRes.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async () => {
    if (!name || !selectedCategory || !price || !value || !selectedStore) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      const categoryId = selectedSubCategory || selectedCategory;

      const formData = new FormData();

      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", categoryId);

      // ✅ VARIANTS
      formData.append(
        "variants",
        JSON.stringify([
          {
            type: variantType,
            value,
            unit,
            price,
            offerPrice: offerPrice || undefined,
            sku: sku || undefined,
          },
        ]),
      );

      // ✅ INVENTORY (Store-wise stock)
      formData.append(
        "inventory",
        JSON.stringify([
          {
            store: selectedStore,
            variantIndex: 0, // because we are creating only 1 variant now
            quantity: stock,
          },
        ]),
      );

      if (image) {
        formData.append("image", image);
      }

      await axiosInstance.post("/api/products", formData);
      console.log(
        "Product created successfully",
        axiosInstance.defaults.baseURL,
      );

      toast({
        title: "Product created",
        status: "success",
        duration: 3000,
      });

      // Reset form
      setName("");
      setDescription("");
      setSelectedCategory("");
      setSelectedSubCategory("");
      setValue(0);
      setPrice(0);
      setOfferPrice(0);
      setStock(0);
      setSku("");
      setVariantType("weight");
      setUnit("kg");
      setSelectedStore("");
      setImage(null);

      onClose();
      await loadData();
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Error creating product",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/products/${id}`);
      toast({
        title: "Product deleted",
        status: "success",
        duration: 3000,
      });
      await loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error deleting product",
        status: "error",
        duration: 3000,
      });
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setFilterStatus("all");
  };

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Product Inventory</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="orange" onClick={onOpen}>
            Add Product
          </Button>
        </Flex>

        {/* Filters */}
        <Box bg="white" p={5} rounded="lg" shadow="sm" mb={6}>
          <HStack spacing={4} mb={4} flexWrap="wrap">
            <InputGroup maxW="300px">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="gray.50"
                border="none"
                _focus={{ bg: "white", boxShadow: "sm" }}
              />
            </InputGroup>

            <Select
              placeholder="All Categories"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              maxW="250px"
              bg="gray.50"
              border="none"
              _focus={{ bg: "white", boxShadow: "sm" }}
            >
              {flatCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              maxW="150px"
              bg="gray.50"
              border="none"
              _focus={{ bg: "white", boxShadow: "sm" }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>

            <Button
              variant="outline"
              onClick={resetFilters}
              borderColor="gray.300"
              _hover={{ bg: "gray.50" }}
            >
              Reset
            </Button>
          </HStack>

          <Text fontSize="sm" color="gray.600" fontWeight="medium">
            Showing {filteredProducts.length} of {products.length} products
          </Text>
        </Box>

        {/* Products Table */}
        <Box bg="white" rounded="lg" shadow="sm">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Variant</Th>
                <Th isNumeric>Price</Th>
                <Th isNumeric>Stock</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProducts.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text color="gray.500">No products found</Text>
                  </Td>
                </Tr>
              ) : (
                filteredProducts.map((product) => (
                  <Tr key={product._id} _hover={{ bg: "gray.50" }}>
                    <Td fontWeight="medium">{product.name}</Td>
                    <Td>{product.category?.name || "N/A"}</Td>
                    <Td>
                      {product.variants[0]?.value} {product.variants[0]?.unit}
                    </Td>
                    <Td isNumeric>
                      <VStack spacing={0} align="flex-end">
                        <Text fontWeight="semibold">
                          ₹{product.variants[0]?.price}
                        </Text>
                        {product.variants[0]?.offerPrice && (
                          <Text
                            fontSize="xs"
                            color="orange.600"
                            fontWeight="medium"
                          >
                            Offer: ₹{product.variants[0]?.offerPrice}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td isNumeric>
                      <Badge
                        colorScheme={
                          product.variants[0]?.stock > 10
                            ? "green"
                            : product.variants[0]?.stock > 0
                              ? "yellow"
                              : "red"
                        }
                      >
                        {product.variants[0]?.stock}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={product.isActive ? "green" : "gray"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack>
                        <IconButton
                          aria-label="Edit product"
                          icon={<EditIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="orange"
                        />
                        <IconButton
                          aria-label="Delete product"
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(product._id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Create Product Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Product</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Product Name</FormLabel>
                <Input
                  placeholder="Enter product name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  placeholder="Enter product description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Parent Category</FormLabel>
                <Select
                  placeholder="Select category"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory("");
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {subCategories.length > 0 && (
                <FormControl>
                  <FormLabel>Sub Category</FormLabel>
                  <Select
                    placeholder="Select subcategory (optional)"
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                  >
                    {subCategories.map((subCat) => (
                      <option key={subCat._id} value={subCat._id}>
                        {subCat.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl isRequired>
                <FormLabel>Variant Type</FormLabel>
                <Select
                  value={variantType}
                  onChange={(e) => setVariantType(e.target.value)}
                >
                  <option value="weight">Weight</option>
                  <option value="pieces">Pieces</option>
                  <option value="box">Box</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Value</FormLabel>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Unit</FormLabel>
                <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="pcs">pcs</option>
                  <option value="box">box</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Price (₹)</FormLabel>
                <Input
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Offer Price (₹)</FormLabel>
                <Input
                  type="number"
                  placeholder="0"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(Number(e.target.value))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Product Image</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImage(e.target.files[0]);
                    }
                  }}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Store</FormLabel>
                <Select
                  placeholder="Select store"
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                >
                  {stores.map((store) => (
                    <option key={store._id} value={store._id}>
                      {store.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Stock</FormLabel>
                <Input
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>SKU</FormLabel>
                <Input
                  placeholder="Optional"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="orange" onClick={handleCreate}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
