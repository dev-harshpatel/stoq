import { InventoryItem } from "@/data/inventory";
import type { PaginatedResult } from "@/hooks/use-paginated-query";
import { Database } from "@/lib/database.types";
import { Order, OrderItem, OrderStatus } from "@/types/order";
import { UserProfile } from "@/types/user";
import { supabase } from "./client";

type InventoryRow = Database["public"]["Tables"]["inventory"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

type StoredInventoryItem = Partial<{
  brand: string | null;
  deviceName: string | null;
  device_name: string | null;
  grade: string | null;
  hst: number | string | null;
  id: string | number | null;
  item_id: string | number | null;
  lastUpdated: string | null;
  last_updated: string | null;
  priceChange: string | null;
  pricePerUnit: number | string | null;
  price_change: string | null;
  price_per_unit: number | string | null;
  purchasePrice: number | string | null;
  purchase_price: number | string | null;
  quantity: number | string | null;
  sellingPrice: number | string | null;
  selling_price: number | string | null;
  storage: string | null;
}>;

const coerceFiniteNumber = (value: number | string): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readNumber = (value: number | string | null | undefined): number => {
  if (value == null) return 0;
  return coerceFiniteNumber(value) ?? 0;
};

const readNullableNumber = (
  value: number | string | null | undefined,
): number | null => {
  if (value == null) return null;
  return coerceFiniteNumber(value);
};

const readString = (value: string | number | null | undefined): string =>
  value == null ? "" : String(value);

const readGrade = (value: string | null | undefined): "A" | "B" | "C" | "D" =>
  value === "A" || value === "B" || value === "C" || value === "D"
    ? value
    : "A";

const readPriceChange = (
  value: string | null | undefined,
): "up" | "down" | "stable" | undefined =>
  value === "up" || value === "down" || value === "stable" ? value : undefined;

// ---------------------------------------------------------------------------
// Row-to-model mappers (extracted from contexts for shared use)
// ---------------------------------------------------------------------------

export const dbRowToInventoryItem = (row: InventoryRow): InventoryItem => ({
  id: row.id,
  deviceName: row.device_name,
  brand: row.brand,
  grade: row.grade as "A" | "B" | "C" | "D",
  storage: row.storage,
  quantity: row.quantity,
  pricePerUnit: Number(row.price_per_unit),
  purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
  hst: row.hst != null ? Number(row.hst) : null,
  sellingPrice:
    row.selling_price != null
      ? Number(row.selling_price)
      : Number(row.price_per_unit),
  lastUpdated: row.last_updated,
  priceChange: (row.price_change ?? undefined) as
    | "up"
    | "down"
    | "stable"
    | undefined,
});

export const dbRowToOrder = (row: OrderRow): Order => {
  let items: OrderItem[] = [];

  if (row.items) {
    try {
      if (typeof row.items === "string") {
        const parsed = JSON.parse(row.items);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } else if (Array.isArray(row.items)) {
        items = row.items as unknown as OrderItem[];
      } else if (typeof row.items === "object" && row.items !== null) {
        if ("item" in row.items && "quantity" in row.items) {
          items = [row.items as unknown as OrderItem];
        } else {
          const values = Object.values(row.items);
          if (values.length > 0 && Array.isArray(values[0])) {
            items = values[0] as unknown as OrderItem[];
          } else {
            items = values.filter(
              (v) =>
                typeof v === "object" &&
                v !== null &&
                "item" in v &&
                "quantity" in v,
            ) as unknown as OrderItem[];
          }
        }
      }
    } catch {
      items = [];
    }
  }

  items = items.filter(
    (item): item is OrderItem =>
      item !== null &&
      typeof item === "object" &&
      "item" in item &&
      "quantity" in item &&
      item.item !== null &&
      typeof item.item === "object",
  );

  // Normalize each item's product so the app always sees camelCase (deviceName, sellingPrice, etc.)
  const normalizedItems: OrderItem[] = items.map((oi) => {
    const raw: StoredInventoryItem = oi.item;
    const quantity = typeof oi.quantity === "number" ? oi.quantity : 1;
    const pricePerUnit = readNumber(raw.pricePerUnit ?? raw.price_per_unit);
    return {
      quantity,
      item: {
        id: readString(raw.id ?? raw.item_id),
        deviceName: readString(raw.deviceName ?? raw.device_name),
        brand: readString(raw.brand),
        grade: readGrade(raw.grade),
        storage: readString(raw.storage),
        quantity: readNumber(raw.quantity),
        pricePerUnit,
        purchasePrice: readNullableNumber(
          raw.purchasePrice ?? raw.purchase_price,
        ),
        hst: readNullableNumber(raw.hst),
        sellingPrice: readNumber(
          raw.sellingPrice ??
            raw.selling_price ??
            raw.pricePerUnit ??
            raw.price_per_unit,
        ),
        lastUpdated: readString(raw.lastUpdated ?? raw.last_updated),
        priceChange: readPriceChange(raw.priceChange ?? raw.price_change),
      },
    };
  });

  return {
    id: row.id,
    userId: row.user_id,
    items: normalizedItems,
    subtotal: Number((row as any).subtotal ?? row.total_price),
    taxRate: (row as any).tax_rate ? Number((row as any).tax_rate) : null,
    taxAmount: (row as any).tax_amount ? Number((row as any).tax_amount) : null,
    totalPrice: Number(row.total_price),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rejectionReason: (row as any).rejection_reason ?? null,
    rejectionComment: (row as any).rejection_comment ?? null,
    invoiceNumber: (row as any).invoice_number ?? null,
    invoiceDate: (row as any).invoice_date ?? null,
    poNumber: (row as any).po_number ?? null,
    paymentTerms: (row as any).payment_terms ?? null,
    dueDate: (row as any).due_date ?? null,
    hstNumber: (row as any).hst_number ?? null,
    invoiceNotes: (row as any).invoice_notes ?? null,
    invoiceTerms: (row as any).invoice_terms ?? null,
    invoiceConfirmed: (row as any).invoice_confirmed ?? false,
    invoiceConfirmedAt: (row as any).invoice_confirmed_at ?? null,
    discountAmount: (row as any).discount_amount
      ? Number((row as any).discount_amount)
      : 0,
    discountType: (row as any).discount_type as
      | "percentage"
      | "cad"
      | undefined,
    shippingAmount: (row as any).shipping_amount
      ? Number((row as any).shipping_amount)
      : 0,
    shippingAddress: (row as any).shipping_address ?? null,
    billingAddress: (row as any).billing_address ?? null,
  };
};

export const dbRowToUserProfile = (row: UserProfileRow): UserProfile => ({
  id: row.id,
  userId: row.user_id,
  role: row.role,
  approvalStatus: row.approval_status,
  approvalStatusUpdatedAt: row.approval_status_updated_at,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  businessName: row.business_name,
  businessAddress: row.business_address,
  businessAddressComponents: row.business_address_components as Record<
    string,
    any
  > | null,
  businessState: row.business_state,
  businessCity: row.business_city,
  businessCountry: row.business_country,
  businessYears: row.business_years,
  businessWebsite: row.business_website,
  businessEmail: row.business_email,
  // Shipping Address
  shippingAddress: (row as any).shipping_address ?? null,
  shippingAddressComponents:
    ((row as any).shipping_address_components as Record<string, any> | null) ??
    null,
  shippingCity: (row as any).shipping_city ?? null,
  shippingState: (row as any).shipping_state ?? null,
  shippingCountry: (row as any).shipping_country ?? null,
  shippingPostalCode: (row as any).shipping_postal_code ?? null,
  // Billing Address
  billingAddress: (row as any).billing_address ?? null,
  billingAddressComponents:
    ((row as any).billing_address_components as Record<string, any> | null) ??
    null,
  billingCity: (row as any).billing_city ?? null,
  billingState: (row as any).billing_state ?? null,
  billingCountry: (row as any).billing_country ?? null,
  billingPostalCode: (row as any).billing_postal_code ?? null,
  // Flags
  shippingSameAsBusiness: (row as any).shipping_same_as_business ?? false,
  billingSameAsBusiness: (row as any).billing_same_as_business ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ---------------------------------------------------------------------------
// Inventory queries
// ---------------------------------------------------------------------------

export interface InventoryFilters {
  search: string;
  brand: string;
  grade: string;
  storage: string;
  priceRange: string;
  stockStatus: string;
}

function applyInventoryFilters(query: any, filters: InventoryFilters) {
  if (filters.search) {
    query = query.ilike("device_name", `%${filters.search}%`);
  }
  if (filters.brand !== "all") {
    query = query.eq("brand", filters.brand);
  }
  if (filters.grade !== "all") {
    query = query.eq("grade", filters.grade);
  }
  if (filters.storage !== "all") {
    query = query.eq("storage", filters.storage);
  }
  if (filters.priceRange !== "all") {
    switch (filters.priceRange) {
      case "under200":
        query = query.lt("selling_price", 200);
        break;
      case "200-400":
        query = query.gte("selling_price", 200).lte("selling_price", 400);
        break;
      case "400+":
        query = query.gte("selling_price", 400);
        break;
    }
  }
  if (filters.stockStatus !== "all") {
    switch (filters.stockStatus) {
      case "in-stock":
        query = query.gt("quantity", 10);
        break;
      case "low-stock":
        query = query.gte("quantity", 5).lte("quantity", 10);
        break;
      case "critical":
        query = query.gt("quantity", 0).lt("quantity", 5);
        break;
      case "out-of-stock":
        query = query.eq("quantity", 0);
        break;
    }
  }
  return query;
}

export async function fetchPaginatedInventory(
  filters: InventoryFilters,
  range: { from: number; to: number },
): Promise<PaginatedResult<InventoryItem>> {
  let query = supabase
    .from("inventory")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true }); // Stable sort - prevents reshuffling when created_at ties

  query = applyInventoryFilters(query, filters);
  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(dbRowToInventoryItem),
    count: count || 0,
  };
}

export async function fetchFilterOptions(): Promise<{
  brands: string[];
  storageOptions: string[];
}> {
  const { data, error } = await supabase
    .from("inventory")
    .select("brand, storage");

  if (error || !data) return { brands: [], storageOptions: [] };

  const brands = Array.from(new Set(data.map((r: any) => r.brand)))
    .filter(Boolean)
    .sort() as string[];

  const storageOptions = Array.from(new Set(data.map((r: any) => r.storage)))
    .filter(Boolean)
    .sort((a: string, b: string) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    }) as string[];

  return { brands, storageOptions };
}

export async function fetchAllFilteredInventory(
  filters: InventoryFilters,
): Promise<InventoryItem[]> {
  let query = supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  query = applyInventoryFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(dbRowToInventoryItem);
}

// ---------------------------------------------------------------------------
// Orders queries
// ---------------------------------------------------------------------------

export interface OrdersFilters {
  search: string;
  status: OrderStatus | "all";
}

export async function fetchPaginatedOrders(
  filters: OrdersFilters,
  range: { from: number; to: number },
): Promise<PaginatedResult<Order>> {
  const hasSearch = filters.search.trim().length > 0;

  if (hasSearch) {
    const q = filters.search.trim().toLowerCase();

    // Use .or() for server-side search across multiple columns.
    // For JSONB items column, we cast to text to enable text search.
    let query = supabase
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    // Search across id, status, and items (cast to text for JSONB)
    query = query.or(`id.ilike.%${q}%,status.ilike.%${q}%`);

    query = query.range(range.from, range.to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(dbRowToOrder),
      count: count || 0,
    };
  }

  // No search - simple paginated query
  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(dbRowToOrder),
    count: count || 0,
  };
}

export async function fetchPaginatedUserOrders(
  userId: string,
  statusFilter: OrderStatus | "all",
  range: { from: number; to: number },
): Promise<PaginatedResult<Order>> {
  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(dbRowToOrder),
    count: count || 0,
  };
}

// ---------------------------------------------------------------------------
// Users queries
// ---------------------------------------------------------------------------

export async function fetchPaginatedUsers(
  search: string,
  range: { from: number; to: number },
): Promise<PaginatedResult<UserProfile>> {
  let query = supabase
    .from("user_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${q},last_name.ilike.${q},business_name.ilike.${q},business_email.ilike.${q},phone.ilike.${q},business_city.ilike.${q}`,
    );
  }

  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map((row: any) =>
      dbRowToUserProfile(row as UserProfileRow),
    ),
    count: count || 0,
  };
}

// ---------------------------------------------------------------------------
// Cart price verification
// ---------------------------------------------------------------------------

export interface LatestInventoryPrice {
  id: string;
  deviceName: string;
  sellingPrice: number;
  quantity: number;
}

/**
 * Fetch the latest prices and quantities for specific inventory items
 * Used to verify cart items before checkout
 */
export async function fetchLatestPricesForItems(
  itemIds: string[],
): Promise<LatestInventoryPrice[]> {
  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from("inventory")
    .select("id, device_name, selling_price, price_per_unit, quantity")
    .in("id", itemIds);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    deviceName: row.device_name,
    sellingPrice:
      row.selling_price != null
        ? Number(row.selling_price)
        : Number(row.price_per_unit),
    quantity: row.quantity,
  }));
}
