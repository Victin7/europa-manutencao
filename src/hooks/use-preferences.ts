import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserPrefs = {
  manutencoes_view: "list" | "cards";
  manutencoes_per_page: number;
  manutencoes_tab: string;
  dashboard_collapsed_sections: string[];
  tema: "light" | "dark";
};

const DEFAULTS: UserPrefs = {
  manutencoes_view: "list",
  manutencoes_per_page: 10,
  manutencoes_tab: "todos",
  dashboard_collapsed_sections: [],
  tema: "light",
};

const LEGACY_THEME_KEY = "europa-theme";
const ANON_KEY = "europa-prefs-anon";

function storageKey(userId: string | null) {
  return userId ? `europa-prefs-${userId}` : ANON_KEY;
}

function readPrefs(userId: string | null): UserPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  // Legacy fallback: migrate theme-only key
  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === "dark" || legacy === "light") {
    return { ...DEFAULTS, tema: legacy };
  }
  return DEFAULTS;
}

function writePrefs(userId: string | null, prefs: UserPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch { /* ignore quota */ }
}

export function usePreferences() {
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<UserPrefs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setPrefsState(readPrefs(uid));
      setHydrated(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setPrefsState(readPrefs(uid));
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const setPref = useCallback(<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
    setPrefsState(prev => {
      const next = { ...prev, [key]: value };
      writePrefs(userId, next);
      return next;
    });
  }, [userId]);

  const setPrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...patch };
      writePrefs(userId, next);
      return next;
    });
  }, [userId]);

  return { prefs, setPref, setPrefs, hydrated };
}
