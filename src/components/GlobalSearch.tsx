import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, ClipboardList, Building2, Package } from "lucide-react";
import { fetchManutencoes, type Manutencao, localLabel } from "@/lib/manutencoes";
import { listAtivos, type Ativo } from "@/lib/ativos";
import { listPrestadores, type Prestador } from "@/lib/prestadores";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function GlobalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [manut, setManut] = useState<Manutencao[]>([]);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [prest, setPrest] = useState<Prestador[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetchManutencoes().catch(() => [] as Manutencao[]),
      listAtivos().catch(() => [] as Ativo[]),
      listPrestadores().catch(() => [] as Prestador[]),
    ]).then(([m, a, p]) => { setManut(m); setAtivos(a); setPrest(p); });
  }, [open]);

  const s = q.trim().toLowerCase();
  const matchManut = useMemo(() => {
    if (!s) return manut.slice(0, 6);
    return manut.filter(m => {
      const hay = `${m.numero_chamado} ${m.numero_os} ${m.descricao} ${m.categoria} ${localLabel(m)}`.toLowerCase();
      return hay.includes(s);
    }).slice(0, 8);
  }, [manut, s]);

  const matchAtivos = useMemo(() => {
    if (!s) return ativos.slice(0, 6);
    return ativos.filter(a => {
      const hay = `${a.nome} ${a.categoria} ${a.torre ?? ""} ${a.local ?? ""} ${a.codigo_interno ?? ""} ${a.numero_patrimonio ?? ""}`.toLowerCase();
      return hay.includes(s);
    }).slice(0, 8);
  }, [ativos, s]);

  const matchPrest = useMemo(() => {
    if (!s) return prest.slice(0, 6);
    return prest.filter(p => {
      const hay = `${p.nome_empresa} ${p.responsavel ?? ""} ${p.categoria ?? ""} ${p.cnpj ?? ""}`.toLowerCase();
      return hay.includes(s);
    }).slice(0, 8);
  }, [prest, s]);

  function go(fn: () => void) {
    onOpenChange(false);
    setQ("");
    setTimeout(fn, 50);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar manutenções, ativos, prestadores…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {matchManut.length > 0 && (
          <CommandGroup heading="Manutenções">
            {matchManut.map(m => (
              <CommandItem
                key={m.id}
                value={`m-${m.id}-${m.numero_chamado}-${m.descricao}`}
                onSelect={() => go(() => navigate({ to: "/manutencoes/$id", params: { id: m.id } }))}
              >
                <ClipboardList className="h-4 w-4 mr-2 text-primary" />
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    <span className="font-medium">{m.numero_chamado}</span> — {m.descricao}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{localLabel(m)} · {m.status}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {matchAtivos.length > 0 && (
          <CommandGroup heading="Ativos">
            {matchAtivos.map(a => (
              <CommandItem
                key={a.id}
                value={`a-${a.id}-${a.nome}-${a.categoria}`}
                onSelect={() => go(() => navigate({ to: "/ativos/$id", params: { id: a.id } }))}
              >
                <Package className="h-4 w-4 mr-2 text-[color:var(--chart-3)]" />
                <div className="min-w-0">
                  <div className="text-sm truncate font-medium">{a.nome}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {a.categoria}{a.torre ? ` · ${a.torre}` : ""}{a.local ? ` · ${a.local}` : ""}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {matchPrest.length > 0 && (
          <CommandGroup heading="Prestadores">
            {matchPrest.map(p => (
              <CommandItem
                key={p.id}
                value={`p-${p.id}-${p.nome_empresa}`}
                onSelect={() => go(() => navigate({ to: "/prestadores/$id", params: { id: p.id } }))}
              >
                <Building2 className="h-4 w-4 mr-2 text-[color:var(--warning)]" />
                <div className="min-w-0">
                  <div className="text-sm truncate font-medium">{p.nome_empresa}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p.categoria ?? "—"}{p.responsavel ? ` · ${p.responsavel}` : ""}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function GlobalSearchTrigger({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-primary-foreground/70 hover:bg-white/10 transition ${className ?? ""}`}
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Buscar…</span>
      <kbd className="hidden sm:inline text-[10px] rounded border border-white/20 px-1.5 py-0.5">Ctrl K</kbd>
    </button>
  );
}
