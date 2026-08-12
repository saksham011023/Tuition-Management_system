export type SearchCategory = "all" | "students" | "batches" | "fees" | "payments" | "attendance";

export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
  badge_color?: "green" | "red" | "yellow" | "blue" | "gray";
  meta: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  by_category: Record<string, number>;
}
