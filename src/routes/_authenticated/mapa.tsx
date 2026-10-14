/**
 * Funcionalidade temporariamente desativada na interface.
 *
 * O código foi preservado para possível reutilização futura.
 *
 * Não remover este módulo sem validação da administração.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { fetchManutencoes, isAtrasado, TORRES, type Manutencao } from "@/lib/manutencoes";

export const Route = createFileRoute("/_authenticated/mapa")({
  component: MapaPage,
});

type Status = "ok" | "warn" | "danger";

type Counts = {
  pendente: number;
  andamento: number;
  aguardando: number;
  emergencial: number;
  atrasado: number;
};

function zero(): Counts {
  return { pendente: 0, andamento: 0, aguardando: 0, emergencial: 0, atrasado: 0 };
}

function classify(c: Counts): Status {
  if (c.emergencial > 0 || c.atrasado > 0) return "danger";
  if (c.pendente > 0 || c.andamento > 0 || c.aguardando > 0) return "warn";
  return "ok";
}

const FILL: Record<Status, string> = {
  ok: "var(--success-muted, #dcfce7)",
  warn: "var(--warning-muted, #fef3c7)",
  danger: "var(--danger-muted, #fee2e2)",
};

const STROKE: Record<Status, string> = {
  ok: "var(--success, #16a34a)",
  warn: "var(--warning, #d97706)",
  danger: "var(--danger, #dc2626)",
};

function tooltipText(c: Counts): string {
  const parts: string[] = [];
  if (c.emergencial) parts.push(`${c.emergencial} emergencial${c.emergencial > 1 ? "s" : ""}`);
  if (c.atrasado) parts.push(`${c.atrasado} atrasado${c.atrasado > 1 ? "s" : ""}`);
  if (c.pendente) parts.push(`${c.pendente} pendente${c.pendente > 1 ? "s" : ""}`);
  if (c.andamento) parts.push(`${c.andamento} em andamento`);
  if (c.aguardando) parts.push(`${c.aguardando} aguardando`);
  return parts.length ? parts.join(" · ") : "Sem chamados ativos";
}

const AREAS = ["Piscina", "Academia", "Salão Master", "Churrasqueira", "Playground", "Portaria", "Garagem"] as const;

// Layout coordinates in a 1000x640 viewBox
const TORRE_POS: Record<string, { x: number; y: number }> = {
  "Torre A": { x: 40, y: 60 },
  "Torre B": { x: 40, y: 180 },
  "Torre C": { x: 40, y: 300 },
  "Torre D": { x: 40, y: 420 },
  "Torre E": { x: 780, y: 100 },
  "Torre F": { x: 780, y: 260 },
  "Torre G": { x: 780, y: 420 },
};

const AREA_POS: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  Piscina: { x: 320, y: 90, w: 160, h: 90, label: "Piscinas" },
  Academia: { x: 500, y: 90, w: 130, h: 90, label: "Academia" },
  "Salão Master": { x: 320, y: 210, w: 160, h: 80, label: "Salão Master" },
  Churrasqueira: { x: 500, y: 210, w: 130, h: 80, label: "Churrasqueira" },
  Playground: { x: 320, y: 320, w: 310, h: 80, label: "Playground" },
  Portaria: { x: 420, y: 540, w: 160, h: 70, label: "Portaria" },
  Garagem: { x: 320, y: 440, w: 310, h: 70, label: "Garagem (Subsolo)" },
};

function MapaPage() {
  const navigate = useNavigate();
  const [hover, setHover] = useState<{ x: number; y: number; text: string; title: string } | null>(null);
  const { data: items = [] } = useQuery({ queryKey: ["manutencoes"], queryFn: fetchManutencoes });

  const stats = useMemo(() => {
    const torres: Record<string, Counts> = {};
    const areas: Record<string, Counts> = {};
    for (const t of TORRES) torres[t.id] = zero();
    for (const a of AREAS) areas[a] = zero();

    const bump = (c: Counts, m: Manutencao) => {
      if (m.status === "Concluído") return;
      if (m.status === "Pendente") c.pendente++;
      if (m.status === "Em Andamento") c.andamento++;
      if (m.status === "Aguardando Aprovação") c.aguardando++;
      if (m.prioridade === "Emergencial") c.emergencial++;
      if (isAtrasado(m)) c.atrasado++;
    };

    for (const m of items) {
      if (m.local_manutencao === "Geral") {
        const key = m.area_comum ?? "";
        if (areas[key]) bump(areas[key], m);
      } else if (torres[m.local_manutencao]) {
        bump(torres[m.local_manutencao], m);
      }
    }
    return { torres, areas };
  }, [items]);

  function goTorre(id: string) {
    navigate({ to: "/manutencoes", search: { torre: id } as never });
  }
  function goArea(area: string) {
    navigate({ to: "/manutencoes", search: { torre: "Geral", categoria: undefined, q: area } as never });
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-semibold">Visão espacial</div>
        <h1 className="font-display text-3xl md:text-[2.2rem] leading-tight font-bold text-primary tracking-tight mt-1">
          Mapa do condomínio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clique em uma torre ou área comum para filtrar as manutenções.
        </p>
      </header>

      <Card className="p-4 md:p-6 rounded-2xl relative overflow-hidden">
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 1000 640" className="w-full h-auto min-w-[720px]" role="img" aria-label="Mapa esquemático do Condomínio Europa">
            {/* Backdrop */}
            <rect x="0" y="0" width="1000" height="640" fill="var(--muted, #f8fafc)" />
            <rect x="20" y="20" width="960" height="600" rx="24" fill="var(--card, #ffffff)" stroke="var(--border, #e2e8f0)" strokeWidth="1.5" />

            {/* Central plaza */}
            <rect x="300" y="60" width="360" height="420" rx="18" fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.35)" strokeDasharray="4 4" />

            {/* Towers left (A-D) */}
            {(["Torre A", "Torre B", "Torre C", "Torre D"] as const).map((id) => {
              const pos = TORRE_POS[id];
              const t = TORRES.find(x => x.id === id)!;
              const status = classify(stats.torres[id]);
              const sigla = id.replace("Torre ", "");
              return (
                <g
                  key={id}
                  transform={`translate(${pos.x} ${pos.y})`}
                  className="cursor-pointer transition-[filter] hover:brightness-95"
                  onClick={() => goTorre(id)}
                  onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, title: `${sigla} · ${t.nome}`, text: tooltipText(stats.torres[id]) })}
                  onMouseMove={(e) => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect width="230" height="90" rx="14" fill={FILL[status]} stroke={STROKE[status]} strokeWidth="2" />
                  <text x="30" y="55" fontFamily="var(--font-display, serif)" fontSize="34" fontWeight="800" fill="var(--primary, #0f172a)">{sigla}</text>
                  <text x="80" y="42" fontSize="13" fontWeight="700" fill="var(--primary, #0f172a)" opacity="0.85">{t.nome}</text>
                  <text x="80" y="62" fontSize="11" fill="var(--foreground, #0f172a)" opacity="0.7">
                    {stats.torres[id].pendente + stats.torres[id].andamento + stats.torres[id].aguardando} ativos
                  </text>
                </g>
              );
            })}

            {/* Towers right (E-G) */}
            {(["Torre E", "Torre F", "Torre G"] as const).map((id) => {
              const pos = TORRE_POS[id];
              const t = TORRES.find(x => x.id === id)!;
              const status = classify(stats.torres[id]);
              const sigla = id.replace("Torre ", "");
              return (
                <g
                  key={id}
                  transform={`translate(${pos.x} ${pos.y})`}
                  className="cursor-pointer transition-[filter] hover:brightness-95"
                  onClick={() => goTorre(id)}
                  onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, title: `${sigla} · ${t.nome}`, text: tooltipText(stats.torres[id]) })}
                  onMouseMove={(e) => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect width="190" height="90" rx="14" fill={FILL[status]} stroke={STROKE[status]} strokeWidth="2" />
                  <text x="24" y="55" fontFamily="var(--font-display, serif)" fontSize="34" fontWeight="800" fill="var(--primary, #0f172a)">{sigla}</text>
                  <text x="70" y="42" fontSize="13" fontWeight="700" fill="var(--primary, #0f172a)" opacity="0.85">{t.nome}</text>
                  <text x="70" y="62" fontSize="11" fill="var(--foreground, #0f172a)" opacity="0.7">
                    {stats.torres[id].pendente + stats.torres[id].andamento + stats.torres[id].aguardando} ativos
                  </text>
                </g>
              );
            })}

            {/* Common areas */}
            {AREAS.map((a) => {
              const p = AREA_POS[a];
              const status = classify(stats.areas[a]);
              return (
                <g
                  key={a}
                  className="cursor-pointer transition-[filter] hover:brightness-95"
                  onClick={() => goArea(a)}
                  onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, title: p.label, text: tooltipText(stats.areas[a]) })}
                  onMouseMove={(e) => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="12" fill={FILL[status]} stroke={STROKE[status]} strokeWidth="1.5" />
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--primary, #0f172a)">
                    {p.label}
                  </text>
                </g>
              );
            })}

            {/* Entry label */}
            <text x="500" y="628" textAnchor="middle" fontSize="10" fill="var(--muted-foreground, #64748b)" letterSpacing="3">
              ENTRADA PRINCIPAL
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: STROKE.ok }} /> Sem pendências</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: STROKE.warn }} /> Atenção</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: STROKE.danger }} /> Emergência / Atrasado</div>
        </div>

        {hover && (
          <div
            className="pointer-events-none fixed z-50 rounded-md bg-primary text-primary-foreground text-xs px-2.5 py-1.5 shadow-lg"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
            <div className="font-semibold">{hover.title}</div>
            <div className="opacity-80">{hover.text}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
