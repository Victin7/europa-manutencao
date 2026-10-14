import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "sindico" | "subsindico" | "conselheiro";

export interface UserProfile {
  user_id: string;
  nome: string;
  display_name: string;
  telefone: string | null;
  cargo: string | null;
  torre: string | null;
  status: string;
  ultimo_acesso: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  is_principal?: boolean | null;
}

export function useCurrentRole() {
  return useQuery({
    queryKey: ["current-role"],
    queryFn: async (): Promise<AppRole | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      return (data?.role as AppRole) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const { data } = useCurrentRole();
  return data === "admin";
}

export function useIsReadOnly() {
  const { data } = useCurrentRole();
  return data === "conselheiro" || data === "subsindico";
}

export function useCanManageUsers() {
  const { data } = useCurrentRole();
  return data === "admin";
}

export function useCurrentProfile() {
  return useQuery({
    queryKey: ["current-profile"],
    queryFn: async (): Promise<UserProfile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      return (data as UserProfile) ?? null;
    },
    staleTime: 30_000,
  });
}

/**
 * Lista de torres permitidas para o usuário atual.
 * - admin / sindico → null (todas)
 * - subsindico / conselheiro → [profile.torre] (apenas a torre dele + Geral)
 */
export function useAllowedTorres(): string[] | null {
  const { data: role } = useCurrentRole();
  const { data: profile } = useCurrentProfile();
  if (role === "subsindico" || role === "conselheiro") {
    return profile?.torre ? [profile.torre] : [];
  }
  return null;
}
