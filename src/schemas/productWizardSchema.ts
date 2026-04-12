import { z } from "zod";
import type { ProductFieldVisibility } from "../constants/productFields";

const variantSchema = z.object({
  type: z.enum(["weight", "pieces", "box"]),
  value: z.number().positive("Variant size must be > 0"),
  unit: z.enum(["g", "kg", "ml", "l", "pcs", "box"]),
  price: z.number().min(0, "Price must be ≥ 0"),
  offerPrice: z.number().min(0).optional(),
  sku: z.string().max(50).optional(),
});

export type Step0Values = {
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
};

export function validateStep0(values: Step0Values, v: ProductFieldVisibility) {
  const schema = z.object({
    name: v.name
      ? z.string().min(1, "Product name is required").max(200)
      : z.string().max(200).optional(),
    description: v.description ? z.string().max(5000).optional() : z.string().optional(),
    categoryId: z.string().min(1, "Please select a category"),
    tags: v.tags ? z.array(z.string().max(50)).max(100) : z.array(z.string()).optional(),
  });
  return schema.safeParse(values);
}

export type Step1Values = {
  pricingMode: "unit" | "custom-weight" | "fixed";
  baseUnit: string;
  pricePerUnit: string;
  minOrderQty: string;
  maxOrderQty: string;
};

export function validateStep1(values: Step1Values, v: ProductFieldVisibility) {
  const schema = z
    .object({
      pricingMode: v.pricingMode
        ? z.enum(["unit", "custom-weight", "fixed"])
        : z.enum(["unit", "custom-weight", "fixed"]).optional(),
      baseUnit: z.enum(["kg", "g", "ml", "l", "pcs"], { message: "Select a base unit" }),
      pricePerUnit: v.pricePerUnit
        ? z
            .string()
            .min(1, "Enter price per unit")
            .refine((s) => !Number.isNaN(Number(s)) && Number(s) >= 0, "Price must be ≥ 0")
        : z.string().optional(),
      minOrderQty: v.minOrderQty
        ? z
            .string()
            .optional()
            .refine((s) => !s || (!Number.isNaN(Number(s)) && Number(s) >= 0), "Invalid min order qty")
        : z.string().optional(),
      maxOrderQty: v.maxOrderQty
        ? z
            .string()
            .optional()
            .refine((s) => !s || (!Number.isNaN(Number(s)) && Number(s) >= 0), "Invalid max order qty")
        : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (v.minOrderQty && v.maxOrderQty && data.minOrderQty && data.maxOrderQty) {
        const min = Number(data.minOrderQty);
        const max = Number(data.maxOrderQty);
        if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Min order qty cannot exceed max", path: ["minOrderQty"] });
        }
      }
    });
  return schema.safeParse(values);
}

/** Loose input from React state before Zod narrows `unit` / `type`. */
export type VariantLike = {
  type: string;
  value: number;
  unit: string;
  price: number;
  offerPrice?: number;
  sku?: string;
};

export function validateStep2Variants(
  pricingMode: "unit" | "custom-weight" | "fixed",
  variants: VariantLike[],
  v: ProductFieldVisibility
): { success: true } | { success: false; message: string } {
  if (!v.variants || pricingMode !== "fixed") return { success: true };
  if (variants.length === 0) return { success: false, message: "Add at least one variant for Fixed Variants pricing." };
  for (const variant of variants) {
    const r = variantSchema.safeParse(variant);
    if (!r.success) return { success: false, message: r.error.issues[0]?.message ?? "Invalid variant" };
  }
  return { success: true };
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((e) => e.message).join(" · ");
}
