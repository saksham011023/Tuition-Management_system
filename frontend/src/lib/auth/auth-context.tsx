"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";
import { UserProfile } from "@/types/auth";
import { LoginInput, RegisterInput } from "../validators/auth";
import { useToast } from "@/hooks/useToast";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const res = await apiClient.get<UserProfile>(API_ENDPOINTS.AUTH.ME);
          setUser(res.data);
        } catch (error) {
          console.error("Failed to load user info:", error);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (credentials: LoginInput) => {
    setLoading(true);
    try {
      const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const { access_token, refresh_token, user: profile } = res.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser(profile);
      showToast("Logged in successfully", "success");

      const targetPath = profile && profile.is_onboarded === false ? "/onboarding" : "/dashboard";
      if (typeof window !== "undefined") {
        window.location.href = targetPath;
      } else {
        router.push(targetPath);
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const msg =
        (typeof detail === "object" ? detail?.message : detail) ||
        error.response?.data?.message ||
        "Login failed. Check your credentials.";
      showToast(typeof msg === "string" ? msg : "Login failed.", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    setLoading(true);
    try {
      const res = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
      const { access_token, refresh_token, user: profile } = res.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser(profile);
      showToast("Account created successfully", "success");

      if (typeof window !== "undefined") {
        window.location.href = "/onboarding";
      } else {
        router.push("/onboarding");
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const msg =
        (typeof detail === "object" ? detail?.message : detail) ||
        error.response?.data?.message ||
        "Registration failed. Email may already be registered.";
      showToast(typeof msg === "string" ? msg : "Registration failed.", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    showToast("Logged out successfully", "info");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
