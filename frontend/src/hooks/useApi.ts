import { useCallback } from "react";
import { useRouter } from "next/navigation";

export interface ApiRequestOptions extends RequestInit {
  json?: any;
}

export function useApi() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const fetchWithAuth = useCallback(
    async (endpoint: string, options: ApiRequestOptions = {}) => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token") || localStorage.getItem("token")
          : null;

      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      if (options.json && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
        options.body = JSON.stringify(options.json);
      }

      const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

      try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
          // Token expired or invalid
          if (typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("token");
            router.push("/"); // Redirect to login
          }
          throw new Error("Unauthorized access. Redirecting to login.");
        }

        return response;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    [baseUrl, router]
  );

  return { fetchWithAuth };
}
