import { useMemo } from "react";
import { useAdminAuth } from "../context/useAdminAuth";
import type { ProductFieldVisibility } from "../constants/productFields";
import { resolveProductFieldVisibility } from "../utils/resolveProductFieldVisibility";

/**
 * Current tenant’s product form visibility (from `/api/auth/me` + defaults).
 * Use this anywhere product create/edit UI must stay aligned with super-admin settings.
 */
export function useProductFieldConfig(): ProductFieldVisibility {
  const { productFields } = useAdminAuth();
  return useMemo(() => resolveProductFieldVisibility(productFields), [productFields]);
}
