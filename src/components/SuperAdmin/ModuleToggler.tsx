import {
  Box,
  Divider,
  Flex,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import {
  ADMIN_MODULE_DEFINITIONS,
  ADMIN_MODULE_GROUP_LABELS,
  type AdminModuleGroupId,
  type AdminModuleKey,
} from "../../constants/modules";

interface Props {
  organizationId: string;
  planId?: string | null;
  initialModules: string[];
  onModulesUpdated?: (modules: string[]) => void;
}

export default function ModuleToggler({
  organizationId,
  planId,
  initialModules,
  onModulesUpdated,
}: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<AdminModuleKey[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const keys = ADMIN_MODULE_DEFINITIONS.filter((m) => initialModules.includes(m.key)).map(
      (m) => m.key
    );
    setSelected(keys);
  }, [initialModules]);

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

  const planLocked = Boolean(planId);

  const handleToggle = async (moduleKey: AdminModuleKey) => {
    if (planLocked) {
      toast({
        title: "Modules managed by plan",
        description: "This organization's modules are controlled by its assigned plan.",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const prev = selected;
    const next = selected.includes(moduleKey)
      ? selected.filter((m) => m !== moduleKey)
      : [...selected, moduleKey];

    setSelected(next);
    setUpdating(true);
    try {
      const res = await axiosInstance.patch(
        `/api/super-admin/organizations/${organizationId}/modules`,
        { modules: next }
      );
      const updated = res.data?.organization?.modules;
      if (Array.isArray(updated)) {
        setSelected(
          ADMIN_MODULE_DEFINITIONS.filter((m) => updated.includes(m.key)).map((m) => m.key)
        );
        onModulesUpdated?.(updated);
      }
      toast({ title: "Modules updated", status: "success", duration: 2500 });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Update failed";
      toast({ title: msg, status: "error", duration: 5000 });
      setSelected(prev);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Stack spacing={4}>
      {(Object.keys(modulesByGroup) as AdminModuleGroupId[]).map((groupId) => {
        const groupMods = modulesByGroup[groupId];
        if (!groupMods.length) return null;
        return (
          <Box key={groupId}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              {ADMIN_MODULE_GROUP_LABELS[groupId]}
            </Text>
            <Divider mb={3} />
            <Stack spacing={2}>
              {groupMods.map((mod) => {
                const isEnabled = selected.includes(mod.key);
                return (
                  <Flex key={mod.key} justify="space-between" align="center" py={1}>
                    <Text fontSize="sm">{mod.label}</Text>
                    <Switch
                      isChecked={isEnabled}
                      onChange={() => void handleToggle(mod.key)}
                      colorScheme="orange"
                      isDisabled={updating || planLocked}
                    />
                  </Flex>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
