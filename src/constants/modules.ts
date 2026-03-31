export const ADMIN_MODULES = {
  PRODUCT: "product",
  ORDER: "order",
  INVENTORY: "inventory",
  DELIVERY: "delivery",
  USER: "user",
  STORE: "store",
  CATEGORY: "category",
} as const;

export type AdminModuleKey = (typeof ADMIN_MODULES)[keyof typeof ADMIN_MODULES];

export type AdminModuleGroupId = "core" | "operations" | "management";

export interface AdminModuleDefinition {
  key: AdminModuleKey;
  label: string;
  group: AdminModuleGroupId;
}

export const ADMIN_MODULE_DEFINITIONS: AdminModuleDefinition[] = [
  {
    key: ADMIN_MODULES.PRODUCT,
    label: "Product",
    group: "core",
  },
  {
    key: ADMIN_MODULES.CATEGORY,
    label: "Category",
    group: "core",
  },
  {
    key: ADMIN_MODULES.STORE,
    label: "Store",
    group: "core",
  },
  {
    key: ADMIN_MODULES.ORDER,
    label: "Order",
    group: "operations",
  },
  {
    key: ADMIN_MODULES.DELIVERY,
    label: "Delivery",
    group: "operations",
  },
  {
    key: ADMIN_MODULES.INVENTORY,
    label: "Inventory",
    group: "management",
  },
  {
    key: ADMIN_MODULES.USER,
    label: "User",
    group: "management",
  },
];

export const ADMIN_MODULE_GROUP_LABELS: Record<AdminModuleGroupId, string> = {
  core: "Core",
  operations: "Operations",
  management: "Management",
};

