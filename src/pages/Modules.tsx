import {
  Box,
  Button,
  Text,
  Flex,
  Select,
  Switch,
  Stack,
  Divider,
  Badge,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { colors } from "../../../Ktl/constants/colors";
import axiosInstance from "../services/axiosInstance";
import {
  ADMIN_MODULE_DEFINITIONS,
  ADMIN_MODULE_GROUP_LABELS,
  type AdminModuleGroupId,
  type AdminModuleKey,
} from "../constants/modules";

interface Organization {
  _id: string;
  name: string;
  isActive: boolean;
  modules: string[];
  planId?: string | null;
  subscriptionStatus?: string;
}

export default function Modules() {
  const navigate = useNavigate();
  const toast = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [selectedModules, setSelectedModules] = useState<AdminModuleKey[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoadingOrgs(true);
    axiosInstance
      .get("/api/super-admin/organizations", { params: { page: 1, limit: 100 } })
      .then((res) => {
        if (!mounted) return;
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setOrganizations(data);
        if (data.length > 0) {
          setSelectedOrgId(data[0]._id);
          const initialModules = Array.isArray(data[0].modules) ? data[0].modules : [];
          setSelectedModules(
            ADMIN_MODULE_DEFINITIONS.filter((m) => initialModules.includes(m.key)).map(
              (m) => m.key
            )
          );
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error(err);
        toast({
          title: "Failed to load organizations",
          description: err?.response?.data?.message ?? "Please try again.",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
      })
      .finally(() => {
        if (mounted) setLoadingOrgs(false);
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  const selectedOrg = useMemo(
    () => organizations.find((o) => o._id === selectedOrgId) ?? null,
    [organizations, selectedOrgId]
  );

  const modulesByGroup = useMemo(
    () =>
      ADMIN_MODULE_DEFINITIONS.reduce<Record<AdminModuleGroupId, typeof ADMIN_MODULE_DEFINITIONS>>(
        (acc, mod) => {
          if (!acc[mod.group]) acc[mod.group] = [];
          acc[mod.group].push(mod);
          return acc;
        },
        { core: [], operations: [], management: [] }
      ),
    []
  );

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = organizations.find((o) => o._id === orgId);
    const orgModules = Array.isArray(org?.modules) ? org!.modules : [];
    setSelectedModules(
      ADMIN_MODULE_DEFINITIONS.filter((m) => orgModules.includes(m.key)).map((m) => m.key)
    );
  };

  const handleToggleModule = async (moduleKey: AdminModuleKey) => {
    if (!selectedOrg) return;
    if (selectedOrg.planId) {
      toast({
        title: "Modules managed by plan",
        description: "This organization's modules are controlled by its assigned plan.",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const nextModules = selectedModules.includes(moduleKey)
      ? selectedModules.filter((m) => m !== moduleKey)
      : [...selectedModules, moduleKey];

    setSelectedModules(nextModules);
    setUpdating(true);
    try {
      const res = await axiosInstance.patch(`/api/super-admin/organizations/${selectedOrg._id}/modules`, {
        modules: nextModules,
      });
      const updatedOrg = res.data?.organization;
      if (updatedOrg?._id) {
        setOrganizations((prev) =>
          prev.map((o) => (o._id === updatedOrg._id ? { ...o, modules: updatedOrg.modules } : o))
        );
      }
      toast({
        title: "Modules updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to update modules",
        description: err?.response?.data?.message ?? "Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      const fresh = organizations.find((o) => o._id === selectedOrg._id);
      const freshModules = Array.isArray(fresh?.modules) ? fresh!.modules : [];
      setSelectedModules(
        ADMIN_MODULE_DEFINITIONS.filter((m) => freshModules.includes(m.key)).map((m) => m.key)
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box bg={colors.background} minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Flex justify="space-between" align="center" mb={4}>
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color={colors.textPrimary}>
              Module Control
            </Text>
            <Text fontSize="sm" color={colors.textMuted} mt={1}>
              Toggle ecommerce modules per organization with plan + subscription enforcement.
            </Text>
          </Box>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            Back to Dashboard
          </Button>
        </Flex>

        {loadingOrgs ? (
          <Flex align="center" justify="center" mt={12}>
            <Spinner color={colors.primary} size="lg" />
          </Flex>
        ) : organizations.length === 0 ? (
          <Box mt={8}>
            <Text color={colors.textMuted} fontSize="sm">
              No organizations found yet. Create an organization first to manage modules.
            </Text>
            <Button
              mt={4}
              bg={colors.primary}
              color="white"
              _hover={{ bg: colors.primaryDark }}
              onClick={() => navigate("/organizations/create")}
            >
              Create Organization
            </Button>
          </Box>
        ) : (
          <>
            <Box
              bg={colors.card}
              border="1px solid"
              borderColor={colors.border}
              rounded="lg"
              p={4}
              mb={6}
            >
              <Flex align="center" gap={4} flexWrap="wrap">
                <Box>
                  <Text fontSize="sm" color={colors.textMuted}>
                    Organization
                  </Text>
                  <Select
                    mt={1}
                    size="sm"
                    value={selectedOrgId ?? ""}
                    onChange={(e) => handleOrgChange(e.target.value)}
                    maxW="280px"
                    bg={colors.background}
                    borderColor={colors.border}
                  >
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.name}
                      </option>
                    ))}
                  </Select>
                </Box>

                {selectedOrg && (
                  <Flex gap={3} align="center" flexWrap="wrap">
                    <Badge
                      colorScheme={selectedOrg.isActive ? "green" : "red"}
                      variant="subtle"
                    >
                      {selectedOrg.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {selectedOrg.planId && (
                      <Badge colorScheme="purple" variant="subtle">
                        Plan-managed modules
                      </Badge>
                    )}
                    {selectedOrg.subscriptionStatus && (
                      <Badge colorScheme="blue" variant="subtle">
                        {selectedOrg.subscriptionStatus}
                      </Badge>
                    )}
                  </Flex>
                )}
              </Flex>
            </Box>

            <Box
              bg={colors.card}
              border="1px solid"
              borderColor={colors.border}
              rounded="lg"
              p={6}
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontWeight="semibold" color={colors.textSecondary}>
                  Ecommerce Modules
                </Text>
                {updating && (
                  <Flex align="center" gap={2}>
                    <Spinner size="sm" color={colors.primary} />
                    <Text fontSize="xs" color={colors.textMuted}>
                      Saving changes…
                    </Text>
                  </Flex>
                )}
              </Flex>

              <Stack spacing={4}>
                {(Object.keys(modulesByGroup) as AdminModuleGroupId[]).map((groupId) => {
                  const groupModules = modulesByGroup[groupId];
                  if (!groupModules.length) return null;
                  return (
                    <Box key={groupId}>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color={colors.textSecondary}
                        mb={2}
                      >
                        {ADMIN_MODULE_GROUP_LABELS[groupId]}
                      </Text>
                      <Divider borderColor={colors.border} mb={3} />
                      <Stack spacing={2}>
                        {groupModules.map((mod) => {
                          const isEnabled = selectedModules.includes(mod.key);
                          return (
                            <Flex
                              key={mod.key}
                              justify="space-between"
                              align="center"
                              py={2}
                            >
                              <Box>
                                <Text color={colors.textPrimary} fontSize="sm">
                                  {mod.label}
                                </Text>
                              </Box>
                              <Switch
                                isChecked={isEnabled}
                                onChange={() => handleToggleModule(mod.key)}
                                colorScheme="orange"
                                isDisabled={updating || !!selectedOrg?.planId}
                              />
                            </Flex>
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

