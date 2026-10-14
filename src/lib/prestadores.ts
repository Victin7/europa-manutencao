import { supabase } from "@/integrations/supabase/client";
import type { AnexoRef } from "@/lib/manutencoes";
import { parseDateOnly } from "@/lib/manutencoes";

export const CATEGORIAS_PRESTADOR = [
  "Elevadores",
  "Portões",
  "Elétrica",
  "Hidráulica",
  "Pintura",
  "Jardinagem",
  "Limpeza",
  "CFTV",
  "Interfonia",
  "Piscina",
  "Bombas",
  "AVCB",
  "Ar-condicionado",
  "Impermeabilização",
  "Civil",
  "Outros",
] as const;

export type CategoriaPrestador = (typeof CATEGORIAS_PRESTADOR)[number];

export const STATUS_PRESTADOR = [
  { value: "ativa", label: "Ativa", color: "success", emoji: "🟢" },
  { value: "em_avaliacao", label: "Em avaliação", color: "warning", emoji: "🟡" },
  { value: "inativa", label: "Inativa", color: "danger", emoji: "🔴" },
] as const;

export type StatusPrestador = (typeof STATUS_PRESTADOR)[number]["value"];

export type Prestador = {
  id: string;
  nome_empresa: string;
  responsavel: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  categoria: string;
  status: StatusPrestador;
  observacoes: string | null;
  logo_path: string | null;
  documentos: AnexoRef[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrestadorAvaliacao = {
  id: string;
  prestador_id: string;
  manutencao_id: string | null;
  qualidade: number;
  organizacao: number;
  prazo: number;
  atendimento: number;
  limpeza: number;
  nota_geral: number;
  comentario: string | null;
  avaliado_por: string | null;
  created_at: string;
};

export function statusInfo(status: string) {
  return STATUS_PRESTADOR.find(s => s.value === status) ?? STATUS_PRESTADOR[0];
}

export function calcNotaGeral(v: Pick<PrestadorAvaliacao, "qualidade" | "organizacao" | "prazo" | "atendimento" | "limpeza">): number {
  const soma = v.qualidade + v.organizacao + v.prazo + v.atendimento + v.limpeza;
  return Math.round((soma / 5) * 100) / 100;
}

export async function listPrestadores(): Promise<Prestador[]> {
  const { data, error } = await supabase
    .from("prestadores" as never)
    .select("*")
    .order("nome_empresa", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Prestador[];
}

export async function getPrestador(id: string): Promise<Prestador | null> {
  const { data, error } = await supabase
    .from("prestadores" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Prestador) ?? null;
}

export async function createPrestador(values: Partial<Prestador>) {
  const { data: userData } = await supabase.auth.getUser();
  const payload = { ...values, created_by: userData.user?.id ?? null };
  const { data, error } = await supabase
    .from("prestadores" as never)
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Prestador;
}

export async function updatePrestador(id: string, values: Partial<Prestador>) {
  const { data, error } = await supabase
    .from("prestadores" as never)
    .update(values as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Prestador;
}

export async function deletePrestador(id: string) {
  const { error } = await supabase.from("prestadores" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function listAvaliacoes(prestadorId: string): Promise<PrestadorAvaliacao[]> {
  const { data, error } = await supabase
    .from("prestador_avaliacoes" as never)
    .select("*")
    .eq("prestador_id", prestadorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PrestadorAvaliacao[];
}

export async function criarAvaliacao(v: Omit<PrestadorAvaliacao, "id" | "created_at" | "avaliado_por" | "nota_geral"> & { nota_geral?: number }) {
  const { data: userData } = await supabase.auth.getUser();
  const nota_geral = v.nota_geral ?? calcNotaGeral(v);
  const payload = { ...v, nota_geral, avaliado_por: userData.user?.id ?? null };
  const { data, error } = await supabase
    .from("prestador_avaliacoes" as never)
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PrestadorAvaliacao;
}

export type PrestadorHistorico = {
  totalServicos: number;
  ultimoAtendimento: string | null;
  tempoMedioAtendimentoDias: number | null;
  tempoMedioConclusaoDias: number | null;
  avaliacaoMedia: number | null;
  totalAvaliacoes: number;
};

export async function getPrestadorHistorico(prestadorId: string): Promise<PrestadorHistorico> {
  const { data: manuts } = await supabase
    .from("manutencoes")
    .select("created_at, data_inicio, data_conclusao")
    .eq("prestador_id" as never, prestadorId);
  const rows = (manuts ?? []) as Array<{ created_at: string; data_inicio: string | null; data_conclusao: string | null }>;

  const totalServicos = rows.length;
  let ultimo: string | null = null;
  const atendDur: number[] = [];
  const conclDur: number[] = [];
  for (const r of rows) {
    if (r.data_conclusao) {
      if (!ultimo || parseDateOnly(r.data_conclusao) > parseDateOnly(ultimo)) ultimo = r.data_conclusao;
      if (r.data_inicio) {
        const dias = (parseDateOnly(r.data_conclusao).getTime() - parseDateOnly(r.data_inicio).getTime()) / 86400000;
        if (dias >= 0) conclDur.push(dias);
      }
      const totalDias = (parseDateOnly(r.data_conclusao).getTime() - new Date(r.created_at).getTime()) / 86400000;
      if (totalDias >= 0) atendDur.push(totalDias);
    }
  }
  const avg = (arr: number[]) => arr.length === 0 ? null : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

  const avals = await listAvaliacoes(prestadorId);
  const avaliacaoMedia = avals.length === 0
    ? null
    : Math.round((avals.reduce((a, b) => a + Number(b.nota_geral), 0) / avals.length) * 100) / 100;

  return {
    totalServicos,
    ultimoAtendimento: ultimo,
    tempoMedioAtendimentoDias: avg(atendDur),
    tempoMedioConclusaoDias: avg(conclDur),
    avaliacaoMedia,
    totalAvaliacoes: avals.length,
  };
}

// ============ Timeline ============
export const TIMELINE_STEPS = [
  { key: "solicitado", label: "Solicitado", emoji: "📅" },
  { key: "acionada", label: "Empresa acionada", emoji: "📞" },
  { key: "agendado", label: "Agendado", emoji: "📆" },
  { key: "chegou", label: "Empresa chegou", emoji: "🚚" },
  { key: "iniciado", label: "Serviço iniciado", emoji: "🔧" },
  { key: "fotos", label: "Fotos anexadas", emoji: "📸" },
  { key: "concluido", label: "Serviço concluído", emoji: "✅" },
  { key: "conferido", label: "Conferido pela Administração", emoji: "✔" },
] as const;

export type TimelineEventKey = (typeof TIMELINE_STEPS)[number]["key"];

export type TimelineEvent = {
  evento: TimelineEventKey;
  at: string;
  by?: string | null;
};
