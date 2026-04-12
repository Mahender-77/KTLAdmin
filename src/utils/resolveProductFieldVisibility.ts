import {
  DEFAULT_PRODUCT_FIELD_VISIBILITY,
  PRODUCT_FIELD_KEYS,
  type ProductFieldVisibility,
} from "../constants/productFields";

/**
 * Merge `/api/auth/me` `productFields` with defaults (missing keys = enabled).
 */
export function resolveProductFieldVisibility(raw: Record<string, boolean> | undefined): ProductFieldVisibility {
  const out: ProductFieldVisibility = { ...DEFAULT_PRODUCT_FIELD_VISIBILITY };
  for (const key of PRODUCT_FIELD_KEYS) {
    if (typeof raw?.[key] === "boolean") {
      out[key] = raw[key] as boolean;
    }
  }
  return out;
}
