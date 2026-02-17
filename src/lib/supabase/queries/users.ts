/**
 * Users queries
 * Functions for querying user profile data from Supabase
 */

import type { PaginatedResult } from "@/hooks/use-paginated-query";
import { UserProfile } from "@/types/user";
import { supabase } from "../client";
import { dbRowToUserProfile } from "./mappers";
import { Database } from "@/lib/types/database";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

export async function fetchPaginatedUsers(
  search: string,
  range: { from: number; to: number }
): Promise<PaginatedResult<UserProfile>> {
  let query = supabase
    .from("user_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${q},last_name.ilike.${q},business_name.ilike.${q},business_email.ilike.${q},phone.ilike.${q},business_city.ilike.${q}`
    );
  }

  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map((row: any) =>
      dbRowToUserProfile(row as UserProfileRow)
    ),
    count: count || 0,
  };
}
