export type ListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function normalizeListQuery(query: Record<string, unknown>): Required<ListQuery> {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const sortBy = typeof query.sortBy === "string" ? query.sortBy : "created_at";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { page, pageSize, search, sortBy, sortOrder };
}

export function getRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}
