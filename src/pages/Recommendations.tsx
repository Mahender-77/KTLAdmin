import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  Skeleton,
  Stat,
  StatLabel,
  StatNumber,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import axiosInstance from "../services/axiosInstance";
import { colors } from "../../../Ktl/constants/colors";

type RuntimeConfig = {
  experimentId: string;
  enabled: boolean;
  variants: string[];
  variantWeights: Record<string, number>;
  modelVersion: string;
  placements: string[];
};

type AnalyticsResponse = {
  experimentId: string;
  placement: string | "all";
  days: number;
  totals: {
    impressions: number;
    clicks: number;
    attributedOrders: number;
    ctr: number;
    conversionRate: number;
  };
  variants: Array<{
    variant: string;
    impressions: number;
    clicks: number;
    attributedOrders: number;
    ctr: number;
    conversionRate: number;
  }>;
};

function parseList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function Recommendations() {
  const toast = useToast();
  const [experimentId, setExperimentId] = useState("reco_v1");
  const experimentIdRef = useRef(experimentId);
  experimentIdRef.current = experimentId;
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [variantsStr, setVariantsStr] = useState("A, B");
  const [placementsStr, setPlacementsStr] = useState("home_recommended");
  const [modelVersion, setModelVersion] = useState("v1");
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsPlacement, setAnalyticsPlacement] = useState<string>("all");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  const parsedVariants = useMemo(() => parseList(variantsStr), [variantsStr]);

  const syncFormFromConfig = useCallback((c: RuntimeConfig) => {
    setEnabled(c.enabled);
    setVariantsStr(c.variants.join(", "));
    setPlacementsStr(c.placements.join(", "));
    setModelVersion(c.modelVersion);
    const next: Record<string, string> = {};
    c.variants.forEach((v) => {
      next[v] = String(c.variantWeights[v] ?? 1);
    });
    setWeightInputs(next);
  }, []);

  const loadAnalytics = useCallback(
    async (experimentIdForQuery?: string) => {
      setAnalyticsLoading(true);
      const exp = (experimentIdForQuery ?? experimentIdRef.current).trim();
      try {
        const q = new URLSearchParams();
        q.set("days", String(analyticsDays));
        if (exp) q.set("experimentId", exp);
        if (analyticsPlacement && analyticsPlacement !== "all") {
          q.set("placement", analyticsPlacement);
        }
        const res = await axiosInstance.get<AnalyticsResponse>(`/api/recommendations/analytics?${q.toString()}`);
        setAnalytics(res.data);
      } catch (e) {
        toast({
          title: "Failed to load analytics",
          description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Request failed",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [analyticsDays, analyticsPlacement, toast]
  );

  const loadConfig = useCallback(
    async (idOverride?: string) => {
      setConfigLoading(true);
      const id = idOverride ?? experimentIdRef.current;
      try {
        const q = new URLSearchParams();
        if (id.trim()) q.set("experimentId", id.trim());
        const res = await axiosInstance.get<RuntimeConfig>(
          `/api/recommendations/admin/config?${q.toString()}`
        );
        const exp = res.data.experimentId;
        setExperimentId(exp);
        experimentIdRef.current = exp;
        syncFormFromConfig(res.data);
        void loadAnalytics(exp);
      } catch (e) {
        toast({
          title: "Failed to load config",
          description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Request failed",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
      } finally {
        setConfigLoading(false);
      }
    },
    [loadAnalytics, syncFormFromConfig, toast]
  );

  useEffect(() => {
    void loadConfig("reco_v1");
  }, [loadConfig]);

  const skipPeriodAnalyticsEffect = useRef(true);
  useEffect(() => {
    if (skipPeriodAnalyticsEffect.current) {
      skipPeriodAnalyticsEffect.current = false;
      return;
    }
    void loadAnalytics();
  }, [analyticsDays, analyticsPlacement, loadAnalytics]);

  const setWeight = (variant: string, value: string) => {
    setWeightInputs((prev) => ({ ...prev, [variant]: value }));
  };

  const handleSave = async () => {
    const variants = parseList(variantsStr);
    if (variants.length === 0) {
      toast({ title: "Add at least one variant", status: "warning", duration: 4000 });
      return;
    }
    const placements = parseList(placementsStr);
    if (placements.length === 0) {
      toast({ title: "Add at least one placement", status: "warning", duration: 4000 });
      return;
    }
    const variantWeights: Record<string, number> = {};
    for (const v of variants) {
      const raw = weightInputs[v] ?? "1";
      const n = Number(String(raw).replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        toast({ title: "Invalid weight", description: `Variant ${v} needs a positive number`, status: "warning" });
        return;
      }
      variantWeights[v] = n;
    }
    if (!modelVersion.trim()) {
      toast({ title: "Model version required", status: "warning" });
      return;
    }
    setSaving(true);
    try {
      const res = await axiosInstance.put<RuntimeConfig>("/api/recommendations/admin/config", {
        experimentId: experimentId.trim() || undefined,
        enabled,
        variants,
        variantWeights,
        modelVersion: modelVersion.trim(),
        placements,
      });
      const exp = res.data.experimentId;
      setExperimentId(exp);
      experimentIdRef.current = exp;
      syncFormFromConfig(res.data);
      void loadAnalytics(exp);
      toast({ title: "Config saved", status: "success", duration: 3000 });
    } catch (e) {
      toast({
        title: "Save failed",
        description: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Request failed",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box bg={colors.background} minH="100vh">
      <Sidebar />
      <Header />
      <Box ml="260px" mt="70px" p={8}>
        <VStack align="stretch" spacing={8} maxW="1000px">
          <Box>
            <Heading size="lg" color={colors.textPrimary}>
              Recommendations
            </Heading>
            <Text fontSize="sm" color={colors.textMuted} mt={1}>
              Live experiment config and impression analytics for the current organization.
            </Text>
          </Box>

          <Box bg={colors.card} borderWidth="1px" borderColor={colors.border} borderRadius="md" p={6}>
            <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
              <Text fontWeight="semibold" color={colors.textPrimary}>
                Experiment config
              </Text>
              <HStack>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={configLoading}
                  onClick={() => {
                    void loadConfig();
                  }}
                >
                  Reload
                </Button>
                <Button size="sm" colorScheme="orange" isLoading={saving} onClick={() => void handleSave()}>
                  Save
                </Button>
              </HStack>
            </HStack>

            {configLoading ? (
              <Skeleton height="200px" borderRadius="md" />
            ) : (
              <VStack align="stretch" spacing={4}>
                <FormControl>
                  <FormLabel>Experiment ID</FormLabel>
                  <Input
                    value={experimentId}
                    onChange={(e) => setExperimentId(e.target.value)}
                    maxW="md"
                    placeholder="reco_v1"
                  />
                  <FormHelperText>Save updates this org&apos;s config for the given experiment ID.</FormHelperText>
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Enabled</FormLabel>
                  <Switch isChecked={enabled} onChange={(e) => setEnabled(e.target.checked)} colorScheme="orange" />
                </FormControl>
                <FormControl>
                  <FormLabel>Variants (comma-separated)</FormLabel>
                  <Input
                    value={variantsStr}
                    onChange={(e) => {
                      setVariantsStr(e.target.value);
                    }}
                    maxW="lg"
                    placeholder="A, B, C"
                  />
                </FormControl>
                {parsedVariants.length > 0 ? (
                  <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
                    {parsedVariants.map((v) => (
                      <GridItem key={v}>
                        <FormControl>
                          <FormLabel fontSize="sm">Weight: {v}</FormLabel>
                          <NumberInput
                            min={0.0001}
                            step={0.1}
                            value={weightInputs[v] ?? "1"}
                            onChange={(_, n) => setWeight(v, Number.isNaN(n) ? "" : String(n))}
                          >
                            <NumberInputField />
                          </NumberInput>
                        </FormControl>
                      </GridItem>
                    ))}
                  </Grid>
                ) : null}
                <FormControl>
                  <FormLabel>Placements (comma-separated)</FormLabel>
                  <Input value={placementsStr} onChange={(e) => setPlacementsStr(e.target.value)} maxW="lg" />
                </FormControl>
                <FormControl>
                  <FormLabel>Model version</FormLabel>
                  <Input
                    value={modelVersion}
                    onChange={(e) => setModelVersion(e.target.value)}
                    maxW="xs"
                    placeholder="v1"
                  />
                </FormControl>
              </VStack>
            )}
          </Box>

          <Box bg={colors.card} borderWidth="1px" borderColor={colors.border} borderRadius="md" p={6}>
            <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3} align="flex-start">
              <Text fontWeight="semibold" color={colors.textPrimary}>
                Analytics
              </Text>
              <HStack flexWrap="wrap" spacing={3}>
                <FormControl w="100px" minW="100px">
                  <FormLabel fontSize="xs">Days</FormLabel>
                  <Select
                    value={String(analyticsDays)}
                    onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                    size="sm"
                  >
                    {[7, 14, 30, 60, 90].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl w="200px" minW="200px">
                  <FormLabel fontSize="xs">Placement (optional)</FormLabel>
                  <Input
                    size="sm"
                    placeholder="all"
                    value={analyticsPlacement}
                    onChange={(e) => setAnalyticsPlacement(e.target.value || "all")}
                    list="reco-placements"
                  />
                  <datalist id="reco-placements">
                    {parseList(placementsStr).map((p) => (
                      <option key={p} value={p} />
                    ))}
                    <option value="all" />
                  </datalist>
                </FormControl>
                <Button
                  size="sm"
                  mt="22px"
                  colorScheme="orange"
                  isLoading={analyticsLoading}
                  onClick={() => void loadAnalytics()}
                >
                  Refresh
                </Button>
              </HStack>
            </HStack>

            {analyticsLoading && !analytics ? (
              <Skeleton height="120px" borderRadius="md" />
            ) : analytics ? (
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" color={colors.textMuted}>
                  Experiment: {analytics.experimentId} · window: {analytics.days}d · placement: {analytics.placement}
                </Text>
                <Grid templateColumns="repeat(4, minmax(0, 1fr))" gap={4}>
                  <GridItem>
                    <Stat>
                      <StatLabel>Impressions</StatLabel>
                      <StatNumber>{analytics.totals.impressions}</StatNumber>
                    </Stat>
                  </GridItem>
                  <GridItem>
                    <Stat>
                      <StatLabel>Clicks</StatLabel>
                      <StatNumber>{analytics.totals.clicks}</StatNumber>
                    </Stat>
                  </GridItem>
                  <GridItem>
                    <Stat>
                      <StatLabel>CTR</StatLabel>
                      <StatNumber>{analytics.totals.ctr}%</StatNumber>
                    </Stat>
                  </GridItem>
                  <GridItem>
                    <Stat>
                      <StatLabel>Conv. (impression → order)</StatLabel>
                      <StatNumber>{analytics.totals.conversionRate}%</StatNumber>
                    </Stat>
                  </GridItem>
                </Grid>
                <Divider />
                <Text fontSize="sm" fontWeight="medium" color={colors.textPrimary}>
                  By variant
                </Text>
                {analytics.variants.length === 0 ? (
                  <Text fontSize="sm" color={colors.textMuted}>
                    No impression rows in this window.
                  </Text>
                ) : (
                  <Box overflowX="auto">
                    <Table size="sm" variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Variant</Th>
                          <Th isNumeric>Impressions</Th>
                          <Th isNumeric>Clicks</Th>
                          <Th isNumeric>Orders</Th>
                          <Th isNumeric>CTR</Th>
                          <Th isNumeric>Conv.</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {analytics.variants.map((row) => (
                          <Tr key={row.variant}>
                            <Td>{row.variant}</Td>
                            <Td isNumeric>{row.impressions}</Td>
                            <Td isNumeric>{row.clicks}</Td>
                            <Td isNumeric>{row.attributedOrders}</Td>
                            <Td isNumeric>{row.ctr}%</Td>
                            <Td isNumeric>{row.conversionRate}%</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                )}
              </VStack>
            ) : null}
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}
