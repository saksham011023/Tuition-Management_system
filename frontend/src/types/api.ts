export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  detail?: string;
}
