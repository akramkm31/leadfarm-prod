import { z } from "zod";

export const movementSchema = z.object({
  product_id: z.string().uuid("ID produit invalide"),
  movement_type: z.enum(["entree", "sortie", "transfert", "retour"]),
  quantity: z.number({ message: "Quantité requise" }),
  date: z.string().min(1, "Date requise"),
  category: z.string().optional(),
  culture: z.string().optional(),
  site_id: z.string().uuid().optional(),
  site_name: z.string().optional(),
  details_site: z.string().optional(),
  supplier_id: z.string().uuid().optional().nullable(),
  distributor_id: z.string().uuid().optional().nullable(),
  observations: z.string().max(1000, "Observations trop longues").optional(),
});

export const productSchema = z.object({
  trade_name: z.string().min(1, "Nom commercial requis").max(200),
  category: z.string().min(1, "Catégorie requise"),
  active_substance: z.string().max(500).optional(),
  formulation: z.string().max(100).optional(),
  unit: z.enum(["L", "Kg", "g", "mL", "unité"]).default("L"),
  price_dzd: z.number().nonnegative("Le prix ne peut être négatif").optional(),
  stock_initial_2024: z.number().nonnegative().optional(),
  dose: z.string().max(100).optional(),
  dar: z.number().nonnegative().optional().nullable(),
  expiry_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  role: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  wilaya: z.string().max(100).optional(),
  registration_number: z.string().max(50).optional(),
  active: z.boolean().default(true),
});

export const stockLevelUpdateSchema = z.object({
  current_quantity: z.number().nonnegative("La quantité ne peut être négative").optional(),
  min_threshold: z.number().nonnegative().optional(),
  max_capacity: z.number().positive("La capacité doit être positive").optional(),
  status: z.enum(["ok", "low", "critical", "negative", "overstock"]).optional(),
});

export const alertUpdateSchema = z.object({
  acknowledged: z.boolean(),
});

export type MovementInput = z.infer<typeof movementSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type StockLevelUpdate = z.infer<typeof stockLevelUpdateSchema>;
