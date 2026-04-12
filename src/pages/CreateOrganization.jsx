import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import axiosInstance from "../services/axiosInstance";
import { colors } from "../../../Ktl/constants/colors";
import {
  ADMIN_MODULES,
  ADMIN_MODULE_DEFINITIONS,
  ADMIN_MODULE_GROUP_LABELS,
} from "../constants/modules";

const DEFAULT_MODULES = [
  ADMIN_MODULES.PRODUCT,
  ADMIN_MODULES.ORDER,
  ADMIN_MODULES.STORE,
  ADMIN_MODULES.CATEGORY,
];
const PRODUCT_FIELD_OPTIONS = [
  "name",
  "description",
  "pricePerUnit",
  "pricingMode",
  "variants",
  "inventoryBatches",
  "taxRate",
  "tags",
  "minOrderQty",
  "maxOrderQty",
];

export default function CreateOrganization() {
  const navigate = useNavigate();
  const toast = useToast();

  const [organizationName, setOrganizationName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("ChangeMe@123");
  const [modules, setModules] = useState([...DEFAULT_MODULES]);
  const [productFields, setProductFields] = useState([...PRODUCT_FIELD_OPTIONS]);
  const [submitting, setSubmitting] = useState(false);

  // Chakra's CheckboxGroup can sometimes deliver a single string depending on usage.
  // The backend Zod schema requires `modules` and productFields selections to be arrays.
  const normalizedModules = Array.isArray(modules) ? modules : modules ? [modules] : [];
  const normalizedProductFields = Array.isArray(productFields)
    ? productFields
    : productFields
      ? [productFields]
      : [];

  const productFieldsPayload = useMemo(
    () =>
      PRODUCT_FIELD_OPTIONS.reduce((acc, key) => {
        acc[key] = normalizedProductFields.includes(key);
        return acc;
      }, {}),
    [normalizedProductFields]
  );

  const handleSubmit = async () => {
    if (!organizationName.trim()) {
      toast({ title: "Organization name is required", status: "warning" });
      return;
    }
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      toast({ title: "Admin name, email and password are required", status: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post("/api/super-admin/create-organization-full", {
        organization: { name: organizationName.trim() },
        admin: {
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          password: adminPassword,
        },
        modules: normalizedModules,
        productFields: productFieldsPayload,
      });

      toast({
        title: "Organization created successfully",
        status: "success",
        duration: 3000,
      });
      navigate("/organizations");
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to create organization. Please try again.";
      toast({ title: message, status: "error", duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg={colors.background} minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Heading size="lg" color={colors.textPrimary} mb={2}>
          Create Organization
        </Heading>
        <Text color={colors.textMuted} mb={6}>
          Create a client organization with admin account, modules, and product field controls in one step.
        </Text>

        <Grid templateColumns="repeat(2, 1fr)" gap={6}>
          <GridItem colSpan={2} bg="white" border="1px solid" borderColor={colors.border} p={6} rounded="lg">
            <Heading size="sm" mb={4} color={colors.textSecondary}>
              SECTION 1: Organization Info
            </Heading>
            <FormControl isRequired>
              <FormLabel>Organization Name</FormLabel>
              <Input
                placeholder="e.g. Acme Retail Pvt Ltd"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </FormControl>
          </GridItem>

          <GridItem bg="white" border="1px solid" borderColor={colors.border} p={6} rounded="lg">
            <Heading size="sm" mb={4} color={colors.textSecondary}>
              SECTION 2: Admin Credentials
            </Heading>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                <Text mt={1} fontSize="xs" color={colors.textMuted}>
                  Default password can be changed later by the client admin.
                </Text>
              </FormControl>
            </Stack>
          </GridItem>

          <GridItem bg="white" border="1px solid" borderColor={colors.border} p={6} rounded="lg">
            <Heading size="sm" mb={4} color={colors.textSecondary}>
              SECTION 3: Modules
            </Heading>
            <CheckboxGroup value={modules} onChange={(v) => setModules(v)}>
              <Stack spacing={4}>
                {Object.entries(ADMIN_MODULE_GROUP_LABELS).map(([groupId, groupLabel]) => {
                  const groupedModules = ADMIN_MODULE_DEFINITIONS.filter(
                    (mod) => mod.group === groupId
                  );
                  return (
                    <Box key={groupId}>
                      <Text fontSize="sm" fontWeight="semibold" color={colors.textSecondary} mb={2}>
                        {groupLabel}
                      </Text>
                      <Divider mb={2} />
                      <Stack spacing={2}>
                        {groupedModules.map((mod) => (
                          <Checkbox key={mod.key} value={mod.key}>
                            {mod.label}
                          </Checkbox>
                        ))}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </CheckboxGroup>
          </GridItem>

          <GridItem colSpan={2} bg="white" border="1px solid" borderColor={colors.border} p={6} rounded="lg">
            <Heading size="sm" mb={4} color={colors.textSecondary}>
              SECTION 4: Product Field Control
            </Heading>
            <CheckboxGroup value={productFields} onChange={(v) => setProductFields(v)}>
              <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                {PRODUCT_FIELD_OPTIONS.map((field) => (
                  <Checkbox key={field} value={field}>
                    {field}
                  </Checkbox>
                ))}
              </Grid>
            </CheckboxGroup>
          </GridItem>
        </Grid>

        <Box mt={6} display="flex" gap={3}>
          <Button variant="outline" onClick={() => navigate("/organizations")}>
            Cancel
          </Button>
          <Button
            bg={colors.primary}
            color="white"
            _hover={{ bg: colors.primaryDark }}
            isLoading={submitting}
            onClick={handleSubmit}
          >
            Create Organization
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

