import {
  Box,
  Grid,
  GridItem,
  Text,
  Button,
  Flex,
} from "@chakra-ui/react";

import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Text fontSize="2xl" fontWeight="bold">
            Overview
          </Text>

          <Button
            colorScheme="orange"
            onClick={() => navigate("/categories")}
          >
            + Add Category
          </Button>
        </Flex>

        <Grid templateColumns="repeat(4, 1fr)" gap={6}>
          <GridItem bg="white" p={6} rounded="lg" shadow="md">
            <Text fontWeight="medium">Total Products</Text>
            <Text fontSize="2xl" fontWeight="bold">
              120
            </Text>
          </GridItem>

          <GridItem bg="white" p={6} rounded="lg" shadow="md">
            <Text fontWeight="medium">Total Orders</Text>
            <Text fontSize="2xl" fontWeight="bold">
              45
            </Text>
          </GridItem>

          <GridItem bg="white" p={6} rounded="lg" shadow="md">
            <Text fontWeight="medium">Users</Text>
            <Text fontSize="2xl" fontWeight="bold">
              310
            </Text>
          </GridItem>

          <GridItem bg="white" p={6} rounded="lg" shadow="md">
            <Text fontWeight="medium">Revenue</Text>
            <Text fontSize="2xl" fontWeight="bold">
              ₹54,000
            </Text>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
}
