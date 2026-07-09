import { supabase } from "../utils/supabase.js";
import { getRange } from "../utils/pagination.js";

type ListOptions = {
  table: string;
  page: number;
  pageSize: number;
  search?: string;
  searchColumns?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, string | number | boolean | null | undefined>;
  dateFrom?: string;
  dateTo?: string;
  dateColumn?: string;
  softDelete?: boolean;
};

export async function listRecords(options: ListOptions) {
  const {
    table,
    page,
    pageSize,
    search,
    searchColumns = [],
    sortBy = "created_at",
    sortOrder = "desc",
    filters = {},
    dateFrom,
    dateTo,
    dateColumn = "created_at",
    softDelete = true
  } = options;

  let query = supabase.from(table).select("*", { count: "exact" });

  if (softDelete) {
    query = query.is("deleted_at", null);
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    query = query.eq(key, value as never);
  }

  if (search && searchColumns.length > 0) {
    const orFilters = searchColumns
      .map((col) => `${col}.ilike.%${search.replace(/%/g, "")}%`)
      .join(",");
    query = query.or(orFilters);
  }

  if (dateFrom) {
    query = query.gte(dateColumn, dateFrom);
  }
  if (dateTo) {
    query = query.lte(dateColumn, dateTo);
  }

  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const { from, to } = getRange(page, pageSize);
  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize
  };
}

export async function getById(table: string, id: string, softDelete = true) {
  let query = supabase.from(table).select("*").eq("id", id).limit(1);
  if (softDelete) query = query.is("deleted_at", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createRecord(table: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateRecord(table: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function softDeleteRecord(table: string, id: string) {
  const { data, error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function hardDeleteRecord(table: string, id: string) {
  const { data, error } = await supabase.from(table).delete().eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
