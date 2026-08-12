export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "teacher" | "admin" | "staff" | "parent" | "student" | "assistant_teacher";
  is_active: boolean;
  is_onboarded?: boolean;
  phone?: string | null;
  profile_image?: string | null;
  signature_image?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginResponse extends AuthTokens {
  user: UserProfile;
}

export interface RegisterResponse extends AuthTokens {
  user: UserProfile;
}
