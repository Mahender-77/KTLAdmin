import { Box, Grid, GridItem, Spinner, Text, useToast } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../services/axiosInstance";
import { colors } from "../../../Ktl/constants/colors";

interface StatCardProps {
  label: string;
  value: number;
  helper: string;
}

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <GridItem
      bg={colors.card}
      border="1px solid"
      borderColor={colors.border}
      p={6}
      rounded="lg"
      shadow="sm"
    >
      <Text color={colors.textMuted} fontSize="sm">
        {label}
      </Text>
      <Text color={colors.textPrimary} fontWeight="bold" fontSize="3xl" mt={1}>
        {value}
      </Text>
      <Text color={colors.textMuted} fontSize="xs" mt={2}>
        {helper}
      </Text>
    </GridItem>
  );
}

export default function ClientAdminDashboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      axiosInstance.get("/api/products"),
      axiosInstance.get("/api/orders/admin/all?page=1&limit=1"),
    ])
      .then(([productsRes, ordersRes]) => {
        if (!mounted) return;
        const products = Array.isArray(productsRes.data?.data)
          ? (productsRes.data.data as Array<{ availableQuantity?: unknown }>)
          : [];
        const totalOrders = Number(ordersRes.data?.total ?? 0);
        const totalInventory = products.reduce((sum, product) => {
          const qty = Number(product?.availableQuantity ?? 0);
          return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0);
        setProductCount(products.length);
        setOrderCount(totalOrders);
        setInventoryCount(totalInventory);
      })
      .catch((err: any) => {
        if (!mounted) return;
        toast({
          title: "Unable to load dashboard stats",
          description: err?.response?.data?.message ?? "Please refresh and try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  const cards = useMemo(
    () => [
      {
        label: "Products",
        value: productCount,
        helper: "Total active catalog items for your organization.",
      },
      {
        label: "Orders",
        value: orderCount,
        helper: "Total customer orders tracked by admin order APIs.",
      },
      {
        label: "Inventory",
        value: inventoryCount,
        helper: "Sum of product available quantity across your catalog.",
      },
    ],
    [inventoryCount, orderCount, productCount]
  );

  return (
    <>
      <Box mb={6}>
        <Text fontSize="2xl" fontWeight="bold" color={colors.textPrimary}>
          Client Admin Dashboard
        </Text>
        <Text fontSize="sm" color={colors.textMuted} mt={1}>
          Business overview for products, orders, and inventory.
        </Text>
      </Box>

      {loading ? (
        <Box mt={12} display="flex" justifyContent="center">
          <Spinner size="lg" color={colors.primary} />
        </Box>
      ) : (
        <Grid templateColumns="repeat(3, 1fr)" gap={6}>
          {cards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              helper={card.helper}
            />
          ))}
        </Grid>
      )}
    </>
  );
}

