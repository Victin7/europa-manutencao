import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, ClipboardList, FileBarChart, Plus, LogOut, Menu, X,
  Printer, Moon, Sun, User, Users, ShieldAlert, Building2, Package, CalendarDays, Map,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertsBar } from "@/components/AlertsBar";
import { useRealtimeManutencoes } from "@/hooks/use-realtime-manutencoes";
import { useTheme } from "@/hooks/use-theme";
import { useIsAdmin, useCurrentRole, useCurrentProfile } from "@/hooks/use-role";
import { useServerFn } from "@tanstack/react-start";
import { getPinGateStatus, clearPinSession } from "@/lib/pin.functions";
import europaLogo from "@/assets/europa-logo.png.asset.json";
import { GlobalSearch, GlobalSearchTrigger } from "@/components/GlobalSearch";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    // PIN gate
    try {
      const { getPinGateStatus } = await import("@/lib/pin.functions");
      const status: any = await getPinGateStatus();
      if (status?.requires_pin && !status?.verified && location.pathname !== "/auth/pin") {
        throw redirect({ to: "/auth/pin" });
      }
    } catch (e: any) {
      if (e?.isRedirect) throw e;
    }
    return { user: data.user };
  },
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  // { to: "/mapa", label: "Mapa", icon: Map }, // desativado na interface (código preservado)
  { to: "/manutencoes", label: "Manutenções", icon: ClipboardList },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/prestadores", label: "Prestadores", icon: Building2 },
  { to: "/ativos", label: "Ativos", icon: Package },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/impressoes", label: "Impressões", icon: Printer },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const ADMIN_NAV = [
  { to: "/usuarios", label: "Gerenciar Usuários", icon: Users },
  { to: "/logs", label: "Logs de Acesso", icon: ShieldAlert },
] as const;

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const isAdmin = useIsAdmin();
  const { data: role } = useCurrentRole();
  const { data: profile } = useCurrentProfile();
  const isReadOnly = role === "conselheiro";
  const clearPin = useServerFn(clearPinSession);
  const pinStatus = useServerFn(getPinGateStatus);
  useRealtimeManutencoes();

  // Re-check PIN gate on every navigation (client-side, after layout mount)
  useEffect(() => {
    pinStatus().then((s: any) => {
      if (s?.requires_pin && !s?.verified && location.pathname !== "/auth/pin") {
        navigate({ to: "/auth/pin" });
      }
    }).catch(() => {});
  }, [location.pathname, navigate, pinStatus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    await clearPin().catch(() => {});
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={`no-print fixed lg:static inset-y-0 left-0 z-40 w-72 bg-primary text-primary-foreground transform ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform flex flex-col`}>
        <div className="p-4 border-b border-white/10 flex justify-center">
          <img
            src={europaLogo.url}
            alt="Condomínio Europa Manutenção"
            className="w-full max-w-[220px] h-auto rounded-md shadow-lg"
          />
        </div>

        <div className="p-3 border-b border-white/10">
          <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors ${
                  active ? "bg-gold text-gold-foreground font-semibold" : "text-primary-foreground/80 hover:bg-white/10"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && ADMIN_NAV.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors ${
                  active ? "bg-gold text-gold-foreground font-semibold" : "text-primary-foreground/80 hover:bg-white/10"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {!isReadOnly && (
            <Link
              to="/manutencoes/nova"
              onClick={() => setOpen(false)}
              className="mt-4 flex items-center gap-3 px-4 py-3 rounded-md text-sm border border-gold/40 text-gold hover:bg-gold hover:text-gold-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Manutenção
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          {profile && (
            <Link to="/perfil" className="flex items-center gap-3 rounded-md p-2 hover:bg-white/10 transition-colors">
              <div className="h-9 w-9 rounded-full bg-gold text-gold-foreground grid place-items-center font-bold text-sm shrink-0">
                {(profile.nome || profile.display_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-primary-foreground truncate">
                  {profile.nome || profile.display_name}
                </div>
                <div className="text-[11px] text-primary-foreground/60 truncate">
                  @{profile.display_name}
                </div>
              </div>
            </Link>
          )}
          <button onClick={toggle} className="flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-gold w-full">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Modo claro" : "Modo escuro"}
          </button>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-gold w-full">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {open && <div className="no-print fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print lg:hidden border-b bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={europaLogo.url} alt="Europa Manutenção" className="h-10 w-auto rounded" />
          </div>


          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Buscar">
              <span className="sr-only">Buscar</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>
        <AlertsBar />
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
