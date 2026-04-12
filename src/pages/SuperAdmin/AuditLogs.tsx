import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useToast,
  SimpleGrid,
  Badge,
  Select,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import axiosInstance from "../../services/axiosInstance";
import { sanitizeText } from "../../utils/sanitizeHtml";

/** MongoDB ObjectId (24 hex chars). */
const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

const AUDIT_LOGS_DEBUG = "[AuditLogs]";

/** Browser console — remove or gate with import.meta.env.DEV when done debugging. */
function auditDebug(label: string, payload?: unknown): void {
  if (payload !== undefined) {
    console.log(`${AUDIT_LOGS_DEBUG} ${label}`, payload);
  } else {
    console.log(`${AUDIT_LOGS_DEBUG} ${label}`);
  }
}

interface AuditRow {
  _id: string;
  timestamp?: string;
  tenantId: string | null;
  userId: string;
  userEmail: string | null;
  role: string;
  action: string;
  metadata: Record<string, unknown>;
}

interface DomainAuditRow {
  _id: string;
  createdAt?: string;
  action: string;
  metadata: Record<string, unknown>;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

interface OrgOption {
  _id: string;
  name: string;
  isActive?: boolean;
}

function extractApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errorCode?: string } | undefined;
    const base = data?.message ?? err.message ?? "Request failed";
    const code = data?.errorCode;
    const status = err.response?.status;
    if (status === 401) return `${base} (sign in again)`;
    if (status === 403) return `${base} (super-admin only for platform audit)`;
    if (code) return `${base} (${code})`;
    return base;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function normalizePlatformRow(row: unknown): AuditRow {
  const r = row as Record<string, unknown>;
  const meta = r.metadata;
  return {
    _id: String(r._id ?? ""),
    timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
    tenantId: r.tenantId == null ? null : String(r.tenantId),
    userId: String(r.userId ?? ""),
    userEmail: typeof r.userEmail === "string" ? r.userEmail : null,
    role: typeof r.role === "string" ? r.role : "—",
    action: typeof r.action === "string" ? r.action : "",
    metadata: meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {},
  };
}

export default function AuditLogs() {
  const toast = useToast();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [domainRows, setDomainRows] = useState<DomainAuditRow[]>([]);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainOrgName, setDomainOrgName] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const limit = 20;

  const [draftTenantId, setDraftTenantId] = useState("");
  const [draftAction, setDraftAction] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const [appliedTenantId, setAppliedTenantId] = useState("");
  const [appliedAction, setAppliedAction] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setOrgsLoading(true);
        const res = await axiosInstance.get("/api/super-admin/organizations", {
          params: { page: 1, limit: 200 },
        });
        const raw = res.data?.data;
        auditDebug("GET /api/super-admin/organizations", {
          status: res.status,
          total: res.data?.total,
          count: Array.isArray(raw) ? raw.length : 0,
          sampleIds: Array.isArray(raw) ? raw.slice(0, 3).map((o: { _id?: unknown }) => String(o?._id ?? "")) : [],
        });
        if (!cancelled && Array.isArray(raw)) {
          setOrgOptions(
            raw.map((o: { _id: unknown; name?: string; isActive?: boolean }) => ({
              _id: String(o._id),
              name: typeof o.name === "string" ? o.name : "—",
              isActive: o.isActive,
            }))
          );
        }
      } catch (err: unknown) {
        console.error(`${AUDIT_LOGS_DEBUG} GET /api/super-admin/organizations failed`, err);
        if (isAxiosError(err)) {
          auditDebug("organizations error detail", {
            status: err.response?.status,
            data: err.response?.data,
          });
        }
        if (!cancelled) setOrgOptions([]);
      } finally {
        if (!cancelled) setOrgsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setDomainError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (appliedTenantId.trim()) params.set("tenantId", appliedTenantId.trim());
      if (appliedAction.trim()) params.set("action", appliedAction.trim());
      if (appliedFrom.trim()) {
        const d = new Date(appliedFrom);
        if (!Number.isNaN(d.getTime())) params.set("from", d.toISOString());
      }
      if (appliedTo.trim()) {
        const d = new Date(appliedTo);
        if (!Number.isNaN(d.getTime())) {
          const end = new Date(d);
          end.setHours(23, 59, 59, 999);
          params.set("to", end.toISOString());
        }
      }

      const platformUrl = `/api/audit?${params.toString()}`;
      auditDebug("GET /api/audit (platform)", { url: platformUrl, page, limit });
      const res = await axiosInstance.get(platformUrl);
      const raw = res.data?.data;
      const list = Array.isArray(raw) ? raw.map(normalizePlatformRow) : [];
      auditDebug("GET /api/audit response", {
        status: res.status,
        total: res.data?.total,
        totalPages: res.data?.totalPages,
        rowCount: list.length,
        firstRow: list[0] ?? null,
        rawKeys: res.data && typeof res.data === "object" ? Object.keys(res.data as object) : [],
      });
      setRows(list);
      const tp = res.data?.totalPages;
      setTotalPages(typeof tp === "number" && tp >= 1 ? tp : 1);
    } catch (err: unknown) {
      const msg = extractApiError(err);
      console.error(`${AUDIT_LOGS_DEBUG} GET /api/audit failed`, err);
      if (isAxiosError(err)) {
        auditDebug("/api/audit error detail", {
          status: err.response?.status,
          data: err.response?.data,
          requestUrl: err.config?.url,
        });
      }
      toast({ title: "Platform audit failed", description: msg, status: "error", duration: 8000, isClosable: true });
      setRows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }

    const tid = appliedTenantId.trim();
    if (!MONGO_OBJECT_ID.test(tid)) {
      auditDebug("skip domain audit — invalid or empty tenant id", { tid: tid || "(empty)" });
      setDomainRows([]);
      setDomainOrgName(null);
      setDomainError(null);
      setDomainLoading(false);
      return;
    }

    setDomainLoading(true);
    try {
      const dp = new URLSearchParams({
        organizationId: tid,
        page: "1",
        limit: "100",
      });
      const domainUrl = `/api/audit-entries?${dp.toString()}`;
      auditDebug("GET /api/audit-entries (domain)", { url: domainUrl, organizationId: tid });
      const dres = await axiosInstance.get(domainUrl);
      const dr = dres.data?.data;
      const domainList = Array.isArray(dr) ? (dr as DomainAuditRow[]) : [];
      auditDebug("GET /api/audit-entries response", {
        status: dres.status,
        organizationId: dres.data?.organizationId,
        organizationName: dres.data?.organizationName,
        total: dres.data?.total,
        totalPages: dres.data?.totalPages,
        rowCount: domainList.length,
        firstRow: domainList[0] ?? null,
        rawKeys: dres.data && typeof dres.data === "object" ? Object.keys(dres.data as object) : [],
      });
      setDomainRows(domainList);
      const name = dres.data?.organizationName;
      setDomainOrgName(typeof name === "string" && name.length > 0 ? name : null);
      setDomainError(null);
    } catch (err: unknown) {
      console.error(`${AUDIT_LOGS_DEBUG} GET /api/audit-entries failed`, err);
      if (isAxiosError(err)) {
        auditDebug("/api/audit-entries error detail", {
          status: err.response?.status,
          data: err.response?.data,
          requestUrl: err.config?.url,
        });
      }
      setDomainRows([]);
      setDomainOrgName(null);
      setDomainError(extractApiError(err));
    } finally {
      setDomainLoading(false);
    }
  }, [page, appliedTenantId, appliedAction, appliedFrom, appliedTo, toast]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const applyFilters = () => {
    setAppliedTenantId(draftTenantId);
    setAppliedAction(draftAction);
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftTenantId("");
    setDraftAction("");
    setDraftFrom("");
    setDraftTo("");
    setAppliedTenantId("");
    setAppliedAction("");
    setAppliedFrom("");
    setAppliedTo("");
    setPage(1);
  };

  const onOrganizationSelect = (organizationId: string) => {
    setDraftTenantId(organizationId);
    setAppliedTenantId(organizationId);
    setPage(1);
  };

  const formatTs = (value?: string | number) => {
    if (value === undefined || value === null || value === "") return "—";
    try {
      const d = typeof value === "number" ? new Date(value) : new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleString();
    } catch {
      return "—";
    }
  };

  const metadataText = (meta: Record<string, unknown>) => {
    try {
      return JSON.stringify(meta, null, 2);
    } catch {
      return "{}";
    }
  };

  const tenantIdForDomain = appliedTenantId.trim();
  const showDomainSection = MONGO_OBJECT_ID.test(tenantIdForDomain);

  return (
    <Box bg="gray.100" minH="100vh">
      <Sidebar />
      <Header />

      <Box ml="260px" mt="70px" p={8}>
        <Heading size="lg" mb={2}>
          Audit logs
        </Heading>
        <Text color="gray.600" fontSize="sm" mb={4}>
          This page has <strong>two</strong> feeds: (1) <strong>Platform</strong> — actions performed by{" "}
          <strong>super admins</strong> on the whole platform (tenant modules, plans, status). (2){" "}
          <strong>Tenant activity</strong> — what happens <strong>inside</strong> an organization: client admins,
          orders, catalog, <code>admin.login</code>, etc. (same data tenant admins see under Activity log).
        </Text>
        <Text color="gray.600" fontSize="sm" mb={6}>
          Pick an organization below (or paste its ObjectId) to load tenant activity. Platform filters (action /
          dates) apply only to the first table.
        </Text>

        <Box bg="white" rounded="lg" shadow="sm" p={4} mb={6}>
          <FormControl mb={4} maxW="720px">
            <FormLabel fontSize="sm">Organization — tenant activity (client admins &amp; store events)</FormLabel>
            <Select
              size="sm"
              placeholder={
                orgsLoading ? "Loading organizations…" : "Select a tenant to load domain audit entries…"
              }
              value={draftTenantId && orgOptions.some((o) => o._id === draftTenantId) ? draftTenantId : ""}
              onChange={(e) => onOrganizationSelect(e.target.value)}
              isDisabled={orgsLoading}
            >
              <option value="">— No organization selected —</option>
              {orgOptions.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.isActive === false ? "[Suspended] " : ""}
                  {sanitizeText(o.name)}
                </option>
              ))}
            </Select>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Lists all organizations on the platform. Choosing one loads audit entries for that tenant (not only
              “super-admin only” — that is the table above).
            </Text>
          </FormControl>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel fontSize="sm">Tenant ID (manual)</FormLabel>
              <Input
                size="sm"
                placeholder="Paste ObjectId if not in list"
                value={draftTenantId}
                onChange={(e) => setDraftTenantId(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Action contains (platform)</FormLabel>
              <Input
                size="sm"
                placeholder="e.g. organization.modules"
                value={draftAction}
                onChange={(e) => setDraftAction(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">From (date)</FormLabel>
              <Input
                size="sm"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">To (date)</FormLabel>
              <Input
                size="sm"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </FormControl>
          </SimpleGrid>
          <HStack spacing={3}>
            <Button size="sm" colorScheme="orange" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button size="sm" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </HStack>
        </Box>

        <Heading size="sm" mb={2} color="gray.700">
          1. Platform audit — super-admin actions only
        </Heading>
        <Box bg="white" rounded="lg" shadow="sm" overflow="hidden" mb={8}>
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Timestamp</Th>
                <Th>Tenant</Th>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Action</Th>
                <Th>Metadata</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    Loading…
                  </Td>
                </Tr>
              ) : rows.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    No platform-level super-admin events for these filters. This table does{" "}
                    <strong>not</strong> include tenant/client-admin activity — use{" "}
                    <strong>Organization</strong> above to load the second table.
                  </Td>
                </Tr>
              ) : (
                rows.map((row) => (
                  <Tr key={`p-${row._id}`} verticalAlign="top">
                    <Td whiteSpace="nowrap">{formatTs(row.timestamp)}</Td>
                    <Td fontSize="xs" maxW="140px" wordBreak="break-all">
                      {row.tenantId ? sanitizeText(row.tenantId) : "—"}
                    </Td>
                    <Td fontSize="xs" maxW="140px" wordBreak="break-all">
                      {row.userEmail ? sanitizeText(row.userEmail) : sanitizeText(row.userId)}
                    </Td>
                    <Td>{sanitizeText(row.role)}</Td>
                    <Td fontSize="sm">{sanitizeText(row.action)}</Td>
                    <Td maxW="320px">
                      <Box
                        as="pre"
                        fontSize="xs"
                        p={2}
                        bg="gray.50"
                        rounded="md"
                        overflow="auto"
                        maxH="140px"
                        whiteSpace="pre-wrap"
                        wordBreak="break-word"
                      >
                        {metadataText(row.metadata)}
                      </Box>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {showDomainSection ? (
          <>
            <HStack mb={2} align="center" flexWrap="wrap" gap={2}>
              <Heading size="sm" color="gray.700">
                2. Tenant activity — organization &amp; client admins
              </Heading>
              {domainOrgName ? (
                <Badge colorScheme="purple">{sanitizeText(domainOrgName)}</Badge>
              ) : null}
              {domainLoading ? (
                <Text fontSize="sm" color="gray.500">
                  Loading…
                </Text>
              ) : null}
            </HStack>
            <Text fontSize="xs" color="gray.600" mb={2} wordBreak="break-all">
              Organization ID: {sanitizeText(tenantIdForDomain)}
            </Text>
            {domainError ? (
              <Box bg="red.50" borderWidth="1px" borderColor="red.200" rounded="md" p={3} mb={4}>
                <Text fontSize="sm" color="red.800">
                  {sanitizeText(domainError)}
                </Text>
              </Box>
            ) : null}
            <Box bg="white" rounded="lg" shadow="sm" overflow="hidden">
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Time</Th>
                    <Th>User</Th>
                    <Th>Action</Th>
                    <Th>Metadata</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {domainLoading && domainRows.length === 0 ? (
                    <Tr>
                      <Td colSpan={4} textAlign="center" py={8}>
                        Loading tenant activity…
                      </Td>
                    </Tr>
                  ) : domainRows.length === 0 ? (
                    <Tr>
                      <Td colSpan={4} textAlign="center" py={8}>
                        No domain audit entries for this organization yet (e.g. admin login, orders, catalog
                        changes).
                      </Td>
                    </Tr>
                  ) : (
                    domainRows.map((r) => (
                      <Tr key={`d-${r._id}`} verticalAlign="top">
                        <Td fontSize="xs" whiteSpace="nowrap">
                          {formatTs(r.createdAt)}
                        </Td>
                        <Td fontSize="xs" maxW="180px">
                          {r.userEmail || r.userName ? (
                            <>
                              {r.userName ? <Text fontWeight="medium">{sanitizeText(r.userName)}</Text> : null}
                              {r.userEmail ? (
                                <Text color="gray.600">{sanitizeText(r.userEmail)}</Text>
                              ) : null}
                            </>
                          ) : r.userId ? (
                            <Text fontSize="xs" wordBreak="break-all">
                              {sanitizeText(r.userId)}
                            </Text>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td fontSize="sm">{sanitizeText(r.action)}</Td>
                        <Td maxW="320px">
                          <Box
                            as="pre"
                            fontSize="xs"
                            p={2}
                            bg="gray.50"
                            rounded="md"
                            overflow="auto"
                            maxH="140px"
                            whiteSpace="pre-wrap"
                            wordBreak="break-word"
                          >
                            {metadataText(r.metadata ?? {})}
                          </Box>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          </>
        ) : (
          <Box bg="blue.50" borderWidth="1px" borderColor="blue.200" rounded="md" p={4}>
            <Text fontSize="sm" color="blue.900">
              Select an <strong>organization</strong> in the dropdown above, or paste a 24-character{" "}
              <strong>Tenant ID</strong> and click <strong>Apply filters</strong>, to load tenant-side events
              (client admins created under that org, orders, <code>admin.login</code>, catalog changes).
            </Text>
          </Box>
        )}

        {totalPages > 1 && (
          <HStack mt={4} spacing={4}>
            <Button
              size="sm"
              isDisabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Text fontSize="sm">
              Page {page} of {totalPages} (platform)
            </Text>
            <Button
              size="sm"
              isDisabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </HStack>
        )}
      </Box>
    </Box>
  );
}
