import { Box, Grid, GridItem, Text, Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { colors } from "../../../Ktl/constants/colors";

const CONTROL_CARDS: Array<{ title: string; description: string; route: string }> = [
  {
    title: "Create Organization",
    description: "Provision a new tenant with default platform configuration.",
    route: "/organizations/create",
  },
  {
    title: "Manage Organizations",
    description: "View subscription, status, and enabled modules per tenant.",
    route: "/organizations",
  },
  {
    title: "Manage Client Admins",
    description: "Invite / manage admin users for your client organizations.",
    route: "/admin-users",
  },
  {
    title: "Module Control",
    description: "Toggle tenant modules with plan + subscription enforcement.",
    route: "/modules",
  },
  {
    title: "Field Control (Product Fields)",
    description: "Control which product fields are available for each tenant.",
    route: "/field-control",
  },
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  return (
    <>
      <Box mb={6}>
        <Text fontSize="2xl" fontWeight="bold" color={colors.textPrimary}>
          Super Admin Control Panel
        </Text>
        <Text fontSize="sm" color={colors.textMuted} mt={1}>
          Configure platform modules, subscriptions, and client admins.
        </Text>
      </Box>

      <Grid templateColumns="repeat(3, 1fr)" gap={6}>
        {CONTROL_CARDS.map((card) => (
          <GridItem
            key={card.title}
            bg={colors.card}
            border="1px solid"
            borderColor={colors.border}
            p={6}
            rounded="lg"
            shadow="sm"
            _hover={{
              borderColor: colors.primaryLight,
              transform: "translateY(-1px)",
              transition: "all 0.15s ease-in-out",
            }}
          >
            <Text fontWeight="semibold" fontSize="lg" color={colors.textSecondary}>
              {card.title}
            </Text>
            <Text fontSize="sm" color={colors.textMuted} mt={2} lineHeight={1.5}>
              {card.description}
            </Text>

            <Button
              mt={4}
              bg={colors.primary}
              color="white"
              _hover={{ bg: colors.primaryDark }}
              onClick={() => navigate(card.route)}
            >
              Open
            </Button>
          </GridItem>
        ))}
      </Grid>
    </>
  );
}

