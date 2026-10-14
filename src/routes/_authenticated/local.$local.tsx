import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  type Manutencao, formatDate, nomeTorre, isAtrasado, TORRES,
} from "@/lib/manutencoes";
import { ArrowLeft, Building2, Image as ImageIcon } from "lucide-react";
import { SignedImage, Lightbox } from "@/components/SignedImage";

export const Route = createFileRoute("/_authenticated/local/$local")({ component: LocalPage });

function LocalPage() {
  const { local } = Route.useParams();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["local", local],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("*")
        .eq("local_manutencao", local)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Manutencao[];
    },
  });

  const isGeral = local === "Geral";
  const titulo = isGeral ? "Áreas Comuns (Geral)" : nomeTorre(local);
  const subtitulo = isGeral
    ? "Manutenções em áreas comuns do condomínio"
    : TORRES.find(t => t.id === local)?.nome ?? "";

  const pendentes = items.filter(i => i.status === "Pendente").length;
  const andamento = items.filter(i => i.status === "Em Andamento").length;
  const concluidas = items.filter(i => i.status === "Concluído").length;
  const emergenciais = items.filter(i => i.prioridade === "Emergencial" && i.status !== "Concluído").length;
  const atrasadas = items.filter(isAtrasado).length;

  const catRank = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.categoria, (m.get(i.categoria) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const antes = useMemo(() => items.flatMap(i => i.foto_antes).slice(0, 12), [items]);
  const depois = useMemo(() => items.flatMap(i => i.foto_depois).slice(0, 12), [items]);

  async function openImg(path: string) {
    const { data } = await supabase.storage.from("manutencoes").createSignedUrl(path, 3600);
    if (data?.signedUrl) setLightbox(data.signedUrl);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
      </div>

      <Card className="p-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-lg bg-gold grid place-items-center text-gold-foreground">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Histórico do Local</div>
            <h1 className="font-display text-3xl font-bold">{titulo}</h1>
            <p className="text-sm text-primary-foreground/80">{subtitulo}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total" value={items.length} />
        <Stat label="Pendentes" value={pendentes} />
        <Stat label="Em Andamento" value={andamento} />
        <Stat label="Concluídos" value={concluidas} tone="success" />
        <Stat label="Emergenciais" value={emergenciais} tone="danger" />
      </div>

      {atrasadas > 0 && (
        <Card className="p-4 border-l-4 border-l-[color:var(--danger)] bg-[color:var(--danger)]/5">
          <div className="text-sm text-[color:var(--danger)] font-semibold">
            ⚠ {atrasadas} chamado(s) atrasado(s) (mais de 15 dias em aberto)
          </div>
        </Card>
      )}

      {catRank.length > 0 && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-3">Categorias Mais Recorrentes</h2>
          <div className="flex flex-wrap gap-2">
            {catRank.map(([cat, n]) => (
              <span key={cat} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/40 text-sm">
                <span className="font-semibold text-primary">{cat}</span>
                <span className="text-xs text-muted-foreground">×{n}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Últimas Manutenções</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum chamado registrado.</p>
        ) : (
          <ol className="space-y-2">
            {items.slice(0, 30).map(m => (
              <li key={m.id}>
                <Link to="/manutencoes/$id" params={{ id: m.id }} className="flex flex-wrap items-center justify-between gap-3 py-3 px-3 -mx-3 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[color:var(--success)] font-bold">{m.status === "Concluído" ? "✓" : "•"}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gold">{m.numero_chamado}</div>
                      <div className="font-medium truncate">{m.descricao}</div>
                      <div className="text-xs text-muted-foreground">
                        {isGeral ? (m.area_comum ?? "—") : (m.area_comum === "Apartamento" ? `Apartamento ${m.unidade ?? "—"}` : (m.area_comum ?? "—"))} · {m.categoria} · {formatDate(m.created_at)} · {m.funcionario ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-right shrink-0">
                    <div className="text-muted-foreground">{m.status}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {(antes.length > 0 || depois.length > 0) && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> Galeria — Antes × Depois
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">📸 Antes</div>
              <PhotoGrid items={antes} onOpen={openImg} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">📸 Depois</div>
              <PhotoGrid items={depois} onOpen={openImg} />
            </div>
          </div>
        </Card>
      )}

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

function PhotoGrid({ items, onOpen }: { items: { path: string; name: string }[]; onOpen: (p: string) => void }) {
  if (items.length === 0) {
    return <div className="h-32 grid place-items-center border-2 border-dashed rounded text-xs text-muted-foreground">Sem fotos</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(f => (
        <SignedImage
          key={f.path}
          path={f.path}
          alt={f.name}
          className="w-full h-24 object-cover rounded border cursor-zoom-in hover:opacity-90"
          onClick={() => onOpen(f.path)}
        />
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "danger" }) {
  const cls = tone === "success" ? "text-[color:var(--success)]" : tone === "danger" ? "text-[color:var(--danger)]" : "text-primary";
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 ${cls}`}>{value}</div>
    </Card>
  );
}
