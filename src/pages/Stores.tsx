import {
  Box,
  Button,
  Heading,
  Input,
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
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  IconButton,
} from "@chakra-ui/react";

import { useEffect, useState } from "react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import axiosInstance from "../services/axiosInstance";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useCallback } from "react";


interface Store {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export default function Stores() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
// Reusable function

const fetchStores = useCallback(async () => {
  try {
    const res = await axiosInstance.get("/api/stores");
    setStores(res.data);
  } catch (error) {
    console.error("Error loading stores:", error);
  }
}, []);
  

   useEffect(() => {
  const controller = new AbortController();

  const load = async () => {
    try {
      const res = await axiosInstance.get("/api/stores", {
        signal: controller.signal,
      });
      setStores(res.data);
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error(err);
      }
    }
  };

  load();

  return () => controller.abort();
}, []);


  const handleCreate = async () => {
    if (!name) {
      toast({
        title: "Store name required",
        status: "warning",
      });
      return;
    }

    try {
      await axiosInstance.post("/api/stores", {
        name,
        address,
        city,
        lat,
        lng,
      });

      toast({
        title: "Store created successfully",
        status: "success",
      });

      setName("");
      setAddress("");
      setCity("");
      setLat(undefined);
      setLng(undefined);

      onClose();
      await fetchStores();
    } catch {
      toast({
        title: "Error creating store",
        status: "error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this store?")) return;

    try {
      await axiosInstance.delete(`/api/stores/${id}`);
      toast({ title: "Store deleted", status: "success" });
      await fetchStores();
    } catch {
      toast({ title: "Error deleting store", status: "error" });
    }
  };

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Heading mb={6}>Store Management</Heading>

        <Button leftIcon={<AddIcon />} colorScheme="orange" mb={6} onClick={onOpen}>
          Add Store
        </Button>

        <Table bg="white" rounded="lg">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>City</Th>
              <Th>Address</Th>
              <Th>Coordinates</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {stores.map((store) => (
              <Tr key={store._id}>
                <Td>{store.name}</Td>
                <Td>{store.city}</Td>
                <Td>{store.address}</Td>
                <Td>
                  {store.location?.lat}, {store.location?.lng}
                </Td>
                <Td>
                  <IconButton
                    aria-label="Delete"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => handleDelete(store._id)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* CREATE STORE MODAL */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Store</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>City</FormLabel>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </FormControl>

              <HStack>
                <Input
                  placeholder="Latitude"
                  type="number"
                  onChange={(e) => setLat(Number(e.target.value))}
                />
                <Input
                  placeholder="Longitude"
                  type="number"
                  onChange={(e) => setLng(Number(e.target.value))}
                />
              </HStack>
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
