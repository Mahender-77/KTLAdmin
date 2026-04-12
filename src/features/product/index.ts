/**
 * Product domain: tenant field config, schemas, and shared hooks.
 * Import from here keeps feature boundaries clear as the admin app grows.
 */
export {
  DEFAULT_PRODUCT_FIELD_VISIBILITY,
  PRODUCT_FIELD_KEYS,
  type ProductFieldKey,
  type ProductFieldVisibility,
} from "../../constants/productFields";
export { resolveProductFieldVisibility } from "../../utils/resolveProductFieldVisibility";
export { useProductFieldConfig } from "../../hooks/useProductFieldConfig";
