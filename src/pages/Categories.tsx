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
  Input,
  Select,
  IconButton,
  Badge,
  VStack,
  Text,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  HStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import axios from "axios";

import axiosInstance from "../services/axiosInstance";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import type { ReactElement } from "react";
import {
  AddIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DeleteIcon,
} from "@chakra-ui/icons";

interface Category {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  children?: Category[];
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  // const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // ================= FETCH =================
  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get("/api/categories");
      setCategories(res.data); // backend already returns tree
    } catch {
      toast({ title: "Error fetching categories", status: "error" });
    }
  };

 useEffect(() => {
  let ignore = false;

  (async () => {
    try {
      const res = await axiosInstance.get("/api/categories");
      if (!ignore) {
        setCategories(res.data);
      }
    } catch (error) {
      console.error(error);
    }
  })();

  return () => {
    ignore = true;
  };
}, []);


  // ================= CREATE =================
  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Category name is required", status: "warning" });
      return;
    }

    try {
      await axiosInstance.post("/api/categories", {
        name,
        parent: parent || null,
      });

      setName("");
      setParent(null);
      fetchCategories();
      toast({ title: "Category created successfully", status: "success" });
      onClose();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast({
          title: error.response?.data?.message || "Error creating category",
          status: "error",
        });
      }
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id: string, hasChildren?: boolean) => {
    if (hasChildren) {
      toast({
        title: "Cannot delete category with subcategories",
        description: "Delete or move subcategories first, then delete this category.",
        status: "warning",
        duration: 5000,
      });
      return;
    }
    try {
      await axiosInstance.delete(`/api/categories/${id}`);
      fetchCategories();
      toast({ title: "Category deleted successfully", status: "success" });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Error deleting category";
      toast({ title: message, status: "error", duration: 5000 });
    }
  };

 // ================= EXPAND =================
const toggleExpand = (id: string) => {
  setExpandedCategories((prev) => {
    const newSet = new Set(prev);

    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    return newSet;
  });
};


  // ================= RENDER TREE =================
  const renderCategoryRow = (category: Category, level = 0): ReactElement[] => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category._id);

    const rows: ReactElement[] = [
      <Tr key={category._id}>
        <Td>
          <Flex align="center" pl={level * 8}>
            {hasChildren && (
              <IconButton
                aria-label="toggle"
                size="sm"
                variant="ghost"
                mr={2}
                icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                onClick={() => toggleExpand(category._id)}
              />
            )}
            {!hasChildren && <Box w="32px" />}
            <Text fontWeight={level === 0 ? "bold" : "normal"}>
              {category.name}
            </Text>
            {hasChildren && (
              <Badge ml={2} colorScheme="blue">
                {category.children?.length}
              </Badge>
            )}
          </Flex>
        </Td>
        <Td>{category.slug}</Td>
        <Td>
          {level === 0 ? (
            <Badge colorScheme="green">Parent</Badge>
          ) : (
            <Badge colorScheme="purple">Sub-category</Badge>
          )}
        </Td>
        <Td>
          <HStack>
            <IconButton
              aria-label="delete"
              size="sm"
              colorScheme="red"
              variant="ghost"
              icon={<DeleteIcon />}
              onClick={() => handleDelete(category._id, hasChildren)}
              title={hasChildren ? "Delete subcategories first" : "Delete category"}
            />
          </HStack>
        </Td>
      </Tr>,
    ];

    if (hasChildren && isExpanded) {
      category.children!.forEach((child) => {
        rows.push(...renderCategoryRow(child, level + 1));
      });
    }

    return rows;
  };

  // ================= STATS =================
  const totalCategories = categories.reduce(
    (acc, cat) => acc + 1 + (cat.children?.length || 0),
    0,
  );

  const totalParents = categories.length;

  const totalSubCategories = categories.reduce(
    (acc, cat) => acc + (cat.children?.length || 0),
    0,
  );

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Category Management</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="orange" onClick={onOpen}>
            Add Category
          </Button>
        </Flex>

        {/* Stats */}
        <Flex gap={4} mb={6}>
          <StatCard title="Total Categories" value={totalCategories} />
          <StatCard title="Parent Categories" value={totalParents} />
          <StatCard title="Sub Categories" value={totalSubCategories} />
        </Flex>

        {/* Table */}
        <Box bg="white" rounded="lg" shadow="sm">
          <Table>
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Type</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>{categories.flatMap((cat) => renderCategoryRow(cat))}</Tbody>
          </Table>
        </Box>
      </Box>

      {/* MODAL */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Category</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Parent (Optional)</FormLabel>
                <Select
                  placeholder="Select parent"
                  onChange={(e) => setParent(e.target.value || null)}
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
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

// Simple Stat Card
function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Box bg="white" p={4} rounded="lg" shadow="sm" flex={1}>
      <Text fontSize="sm" color="gray.600">
        {title}
      </Text>
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
    </Box>
  );
}
