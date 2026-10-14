import { useEffect, useState, useMemo } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAtivos, ativoPath, type Ativo } from "@/lib/ativos";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  /** Filtrar por torre/local. Aceita nomes de torre ("Torre A") ou "Geral". Se null, mostra todos. */
  torre?: string | null;
  disabled?: boolean;
  /** Se true, permite selecionar locais também (padrão false). */
  includeLocais?: boolean;
};

const NONE = "__none__";

export function AtivoSelect({ value, onChange, torre, disabled, includeLocais = false }: Props) {
  const [items, setItems] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listAtivos()
      .then(list => { if (alive) setItems(list); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (!includeLocais) list = list.filter(a => a.tipo !== "local");
    if (torre) list = list.filter(a => a.torre === torre || a.torre === "Geral" || !a.torre);
    return list;
  }, [items, torre, includeLocais]);

  // Agrupar por categoria (Elevadores, Bombas, Portões, ...)
  const groups = useMemo(() => {
    const map = new Map<string, Ativo[]>();
    for (const a of filtered) {
      const key = a.categoria || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [filtered]);

  function labelFor(a: Ativo): string {
    const path = ativoPath(a.id, items);
    if (path.length > 1) return path.map(p => p.nome).join(" › ");
    return a.torre && a.torre !== "Geral" ? `${a.torre} › ${a.nome}` : a.nome;
  }

  return (
    <Select
      value={value ?? NONE}
      onValueChange={v => onChange(v === NONE ? null : v)}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Carregando..." : "Selecione (opcional)"} />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={NONE}>— Nenhum —</SelectItem>
        {groups.map(([cat, list]) => (
          <SelectGroup key={cat}>
            <SelectLabel>{cat}</SelectLabel>
            {list.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {labelFor(a)}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
