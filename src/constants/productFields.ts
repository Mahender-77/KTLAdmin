/** Mirrors server `server/src/constants/productFields.ts` */
export const PRODUCT_FIELD_KEYS = [
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
] as const;

export type ProductFieldKey = (typeof PRODUCT_FIELD_KEYS)[number];

export type ProductFieldVisibility = Record<ProductFieldKey, boolean>;

export const DEFAULT_PRODUCT_FIELD_VISIBILITY: ProductFieldVisibility = {
  name: true,
  description: true,
  pricePerUnit: true,
  pricingMode: true,
  variants: true,
  inventoryBatches: true,
  taxRate: true,
  tags: true,
  minOrderQty: true,
  maxOrderQty: true,
};
