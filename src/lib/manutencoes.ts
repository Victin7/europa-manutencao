import { supabase } from "@/integrations/supabase/client";

export const CATEGORIAS = [
  "Elétrica",
  "Hidráulica",
  "Pintura",
  "Encanamento",
  "Alvenaria",
  "Jardim",
  "Limpeza",
  "Portaria",
  "Elevador",
  "Outros",
] as const;

export const PRIORIDADES = ["Baixa", "Média", "Alta", "Emergencial"] as const;
export const STATUSES = ["Pendente", "Em Andamento", "Aguardando Aprovação", "Concluído"] as const;
export const STATUS_ATIVOS = ["Pendente", "Em Andamento", "Aguardando Aprovação"] as const;

export const TORRES = [
  { id: "Torre A", nome: "Madri" },
  { id: "Torre B", nome: "Roma" },
  { id: "Torre C", nome: "Lisboa" },
  { id: "Torre D", nome: "Londres" },
  { id: "Torre E", nome: "Paris" },
  { id: "Torre F", nome: "Atenas" },
  { id: "Torre G", nome: "Amsterdam" },
] as const;

export const LOCAIS = ["Geral", ...TORRES.map(t => t.id)] as const;

export const AREAS_COMUNS = [
  "Portaria",
  "Administração",
  "Piscina",
  "Academia",
  "Salão de Festas",
  "Salão Master",
  "Espaço Pet",
  "Playground",
  "Quadra",
  "Churrasqueira",
  "Garagem",
  "Elevadores",
  "Jardins",
  "Casa de Bombas",
  "Reservatório",
  "Área Externa",
  "Outros",
] as const;

// Torres A-D: unidades 21..232 (apenas finais 1 e 2). Torres E-G: 21..222.
function gerarUnidades(maxAndar: number): string[] {
  const out: string[] = [];
  for (let andar = 2; andar <= maxAndar; andar++) {
    out.push(`${andar}1`);
    out.push(`${andar}2`);
  }
  return out;
}

export const UNIDADES_TORRE_ABCD = gerarUnidades(23); // 21..232
export const UNIDADES_TORRE_EFG = gerarUnidades(22);  // 21..222

export function unidadesDaTorre(torre: string): string[] {
  if (["Torre A", "Torre B", "Torre C", "Torre D"].includes(torre)) return UNIDADES_TORRE_ABCD;
  if (["Torre E", "Torre F", "Torre G"].includes(torre)) return UNIDADES_TORRE_EFG;
  return [];
}

// Subsolos disponíveis por torre
export const SUBSOLOS_POR_TORRE: Record<string, string[]> = {
  "Torre A": ["SS2", "SS3"],
  "Torre B": ["SS2", "SS3"],
  "Torre C": ["SS2", "SS3"],
  "Torre D": ["SS2", "SS3"],
  "Torre E": ["SS1", "SS2"],
  "Torre F": ["SS1", "SS2"],
  "Torre G": ["SS1", "SS2"],
};

export const TIPOS_LOCAL_BASE = ["Apartamento", "Hall Social", "Hall de Serviço"] as const;
export const TIPOS_SUBSOLO_HALLS = ["Hall Social", "Hall de Serviço"] as const;

export function subsolosDaTorre(torre: string): string[] {
  return SUBSOLOS_POR_TORRE[torre] ?? [];
}

/** Lista todos os subtipos válidos de uma torre (armazenados em `area_comum`). */
export function subtiposDaTorre(torre: string): string[] {
  const out: string[] = [...TIPOS_LOCAL_BASE];
  for (const ss of subsolosDaTorre(torre)) {
    for (const h of TIPOS_SUBSOLO_HALLS) out.push(`${ss} - ${h}`);
  }
  return out;
}

/** Lista global de todos subtipos possíveis em torres (para filtros). */
export const TODOS_SUBTIPOS_TORRE = [
  "Apartamento",
  "Hall Social",
  "Hall de Serviço",
  "SS1 - Hall Social",
  "SS1 - Hall de Serviço",
  "SS2 - Hall Social",
  "SS2 - Hall de Serviço",
  "SS3 - Hall Social",
  "SS3 - Hall de Serviço",
] as const;

export function nomeTorre(id: string): string {
  const t = TORRES.find(x => x.id === id);
  return t ? `${t.id} – ${t.nome}` : id;
}

export function localLabel(m: Pick<Manutencao, "local_manutencao" | "unidade" | "area_comum">): string {
  if (m.local_manutencao === "Geral") return `Geral · ${m.area_comum ?? "—"}`;
  const sub = m.area_comum ?? "—";
  if (sub === "Apartamento") return `${nomeTorre(m.local_manutencao)} · Apartamento ${m.unidade ?? "—"}`;
  return `${nomeTorre(m.local_manutencao)} · ${sub}`;
}

/** Local em duas linhas para impressão (OS). */
export function localLinhas(m: Pick<Manutencao, "local_manutencao" | "unidade" | "area_comum">): { linha1: string; linha2: string } {
  if (m.local_manutencao === "Geral") return { linha1: "Geral (Áreas Comuns)", linha2: m.area_comum ?? "—" };
  const sub = m.area_comum ?? "—";
  if (sub === "Apartamento") return { linha1: nomeTorre(m.local_manutencao), linha2: `Apartamento ${m.unidade ?? "—"}` };
  return { linha1: nomeTorre(m.local_manutencao), linha2: sub };
}


export type Categoria = (typeof CATEGORIAS)[number];
export type Prioridade = (typeof PRIORIDADES)[number];
export type Status = (typeof STATUSES)[number];

export type AnexoRef = { path: string; name: string };

export type TimelineEventRef = { evento: string; at: string; by?: string | null };

export type Manutencao = {
  id: string;
  numero_chamado: string;
  numero_os: string;
  local_manutencao: string;
  torre: string | null;
  unidade: string | null;
  area_comum: string | null;
  data_vistoria: string | null;
  funcionario: string | null;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  data_inicio: string | null;
  data_conclusao: string | null;
  data_impressao: string | null;
  data_prevista: string | null;
  observacao: string | null;
  fotos: AnexoRef[];
  foto_antes: AnexoRef[];
  foto_depois: AnexoRef[];
  documentos: AnexoRef[];
  created_at: string;
  updated_at: string | null;
  // Prestador / Terceirizada
  tipo_servico?: string | null;
  prestador_id?: string | null;
  prestador_responsavel?: string | null;
  funcionario_acompanhante?: string | null;
  data_solicitacao?: string | null;
  data_agendada?: string | null;
  valor_servico?: number | null;
  garantia_dias?: number | null;
  orcamentos?: AnexoRef[];
  notas_fiscais?: AnexoRef[];
  arts?: AnexoRef[];
  laudos?: AnexoRef[];
  relatorios?: AnexoRef[];
  contratos?: AnexoRef[];
  timeline_events?: TimelineEventRef[];
  // Ativo / Patrimônio
  ativo_id?: string | null;
};

export async function fetchManutencoes(): Promise<Manutencao[]> {
  const { data, error } = await supabase
    .from("manutencoes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Manutencao[];
}

export function diasAberto(m: Manutencao): number {
  const start = new Date(m.created_at).getTime();
  return Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
}

/** Número de dias após a data_prevista para um chamado ser considerado Atrasado */
export const LIMITE_ATRASO_DIAS = 30;

/** Status que representam serviço em execução (sujeitos a atraso e prazo vencido) */
const STATUSES_EXECUTAVEIS = ["Pendente", "Em Andamento"] as const;

/** Status que jamais entram como atrasados */
export const STATUSES_ISENTOS = ["Aguardando Aprovação", "Concluído", "Cancelado"] as const;

/**
 * Diferença em dias entre hoje e data_prevista.
 * Positivo = data já passou. Negativo = ainda não chegou. null = sem data.
 */
export function diasDesdeVencimento(m: Manutencao): number | null {
  if (!m.data_prevista) return null;
  const diff = Date.now() - new Date(m.data_prevista).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** PRAZO VENCIDO: data_prevista passou, mas ainda dentro dos 30 dias. */
export function isPrazoVencido(m: Manutencao): boolean {
  if (!STATUSES_EXECUTAVEIS.includes(m.status as never)) return false;
  const dias = diasDesdeVencimento(m);
  if (dias === null) return false;
  return dias > 0 && dias < LIMITE_ATRASO_DIAS;
}

/** ATRASADO: chamado parado há 30 dias ou mais após a data_prevista. */
export function isAtrasado(m: Manutencao): boolean {
  if (!STATUSES_EXECUTAVEIS.includes(m.status as never)) return false;
  const dias = diasDesdeVencimento(m);
  if (dias === null) return false;
  return dias >= LIMITE_ATRASO_DIAS;
}

/** Dias em que o chamado está em "Aguardando Aprovação" (null se não estiver). */
export function diasAguardandoAprovacao(m: Manutencao): number | null {
  if (m.status !== "Aguardando Aprovação") return null;
  const ref = m.updated_at ?? m.created_at;
  if (!ref) return null;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

/** Label do indicador de "Aguardando Aprovação" com tempo decorrido. */
export function labelAguardando(m: Manutencao): string | null {
  const dias = diasAguardandoAprovacao(m);
  if (dias === null) return null;
  if (dias === 0) return "Aguardando aprovação desde hoje";
  if (dias === 1) return "Aguardando aprovação há 1 dia";
  return `Aguardando aprovação há ${dias} dias`;
}

/** Label do indicador de Prazo Vencido (1–29 dias). */
export function labelPrazoVencido(m: Manutencao): string | null {
  if (!isPrazoVencido(m)) return null;
  const dias = diasDesdeVencimento(m)!;
  if (dias === 1) return "Prazo vencido há 1 dia";
  return `Prazo vencido há ${dias} dias`;
}

/** Label do indicador de Atrasado (30+ dias). */
export function labelAtrasado(m: Manutencao): string | null {
  if (!isAtrasado(m)) return null;
  const dias = diasDesdeVencimento(m)!;
  return `Atrasado há ${dias} dias`;
}



export function isConcluidaHoje(m: Manutencao): boolean {
  if (m.status !== "Concluído" || !m.data_conclusao) return false;
  const d = toLocalDate(m.data_conclusao);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function statusClasses(m: Manutencao): string {
  if (m.status === "Concluído") return "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30";
  if (m.prioridade === "Emergencial") return "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30";
  if (isAtrasado(m)) return "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/30";
  return "bg-muted text-muted-foreground border-border";
}

export function rowAccent(m: Manutencao): string {
  if (m.status === "Concluído") return "border-l-4 border-l-[color:var(--success)]";
  if (m.status === "Aguardando Aprovação") return "border-l-4 border-l-[color:var(--warning)]";
  if (m.status === "Em Andamento") return "border-l-4 border-l-[color:var(--chart-3)]";
  if (m.status === "Pendente") return "border-l-4 border-l-[color:var(--danger)]";
  if (isAtrasado(m)) return "border-l-4 border-l-[color:var(--danger)]";
  return "border-l-4 border-l-transparent";
}

export function statusBadgeClasses(status: string): string {
  if (status === "Concluído") return "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30";
  if (status === "Aguardando Aprovação") return "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30";
  if (status === "Em Andamento") return "bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)] border-[color:var(--chart-3)]/30";
  if (status === "Pendente") return "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/30";
  return "bg-muted text-muted-foreground border-border";
}

/** true quando o valor é uma data pura "YYYY-MM-DD" (sem horário). */
export function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/**
 * Formata um campo DATE-ONLY sem conversão de timezone.
 * Entrada: "2026-08-07" → Saída: "07/08/2026"
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

/**
 * Converte DATE-ONLY em objeto Date local (FullCalendar e comparações).
 * Nunca usa new Date("YYYY-MM-DD"), que seria interpretado como UTC.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Date local a partir de date-only OU timestamptz. */
export function toLocalDate(value: string): Date {
  return isDateOnly(value) ? parseDateOnly(value) : new Date(value);
}

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  if (isDateOnly(d)) return formatDateOnly(d);
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(d?: string | null): string {
  if (!d) return "—";
  if (isDateOnly(d)) return formatDateOnly(d);
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

export function formatPrevista(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function previstaCls(iso: string | null): "atrasado" | "hoje" | "futuro" | "sem-data" {
  if (!iso) return "sem-data";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "atrasado";
  if (diff < 24 * 60 * 60 * 1000) return "hoje";
  return "futuro";
}

export function monthKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

// ————— Equipe (múltiplos funcionários por OS) —————

export type MembroEquipe = {
  id: string;
  manutencao_id: string;
  nome_funcionario: string;
  adicionado_em: string;
  adicionado_por: string | null;
};

/** Busca a equipe de uma manutenção específica. Retorna array vazio se não houver membros. */
export async function fetchEquipe(manutencaoId: string): Promise<MembroEquipe[]> {
  const { data, error } = await supabase
    .from("manutencao_equipe")
    .select("*")
    .eq("manutencao_id", manutencaoId)
    .order("adicionado_em");
  if (error) return [];
  return (data ?? []) as MembroEquipe[];
}

/** Adiciona um funcionário à equipe de uma OS. Ignora duplicatas silenciosamente. */
export async function adicionarMembro(
  manutencaoId: string,
  nomeFuncionario: string,
  adicionadoPor: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("manutencao_equipe").insert({
    manutencao_id: manutencaoId,
    nome_funcionario: nomeFuncionario,
    adicionado_por: adicionadoPor,
  });
  if (error?.code === "23505") return { error: null };
  if (error) return { error: "Não foi possível adicionar o funcionário." };
  return { error: null };
}

/** Remove um funcionário da equipe de uma OS. */
export async function removerMembro(
  manutencaoId: string,
  nomeFuncionario: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("manutencao_equipe")
    .delete()
    .eq("manutencao_id", manutencaoId)
    .eq("nome_funcionario", nomeFuncionario);
  if (error) return { error: "Não foi possível remover o funcionário." };
  return { error: null };
}

/** Nomes da equipe, com fallback para o campo legado `funcionario`. */
export function nomesEquipe(manutencao: Manutencao, equipe: MembroEquipe[]): string[] {
  if (equipe.length > 0) return equipe.map(m => m.nome_funcionario);
  if (manutencao.funcionario) return [manutencao.funcionario];
  return [];
}

/** Label resumido da equipe. Ex: "Victor, Luís +1" */
export function labelEquipe(nomes: string[], maxVisivel = 2): string {
  if (nomes.length === 0) return "—";
  if (nomes.length <= maxVisivel) return nomes.join(", ");
  const resto = nomes.length - maxVisivel;
  return `${nomes.slice(0, maxVisivel).join(", ")} +${resto}`;
}
