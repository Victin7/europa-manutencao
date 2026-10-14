import { supabase } from "@/integrations/supabase/client";
import { parseDateOnly } from "@/lib/manutencoes";

export const CATEGORIAS_ATIVO = [
  "Elevador",
  "Portão",
  "Motor de Portão",
  "Bomba",
  "Gerador",
  "CFTV",
  "Interfonia",
  "Reservatório",
  "Gás",
  "Infraestrutura",
  "Área Comum",
  "Ar-condicionado",
  "Outros",
] as const;

export type CategoriaAtivo = (typeof CATEGORIAS_ATIVO)[number];

export type TipoAtivo = "local" | "ativo" | "subativo" | "componente";
export type StatusAtivo = "operacional" | "em_manutencao" | "inoperante" | "desativado";

export const TIPOS_ATIVO: TipoAtivo[] = ["local", "ativo", "subativo", "componente"];
export const STATUS_ATIVO: StatusAtivo[] = ["operacional", "em_manutencao", "inoperante", "desativado"];

export const TIPO_ATIVO_LABEL: Record<TipoAtivo, string> = {
  local: "Local",
  ativo: "Ativo",
  subativo: "Subativo",
  componente: "Componente",
};

export const STATUS_ATIVO_LABEL: Record<string, string> = {
  operacional: "Operacional",
  em_manutencao: "Em Manutenção",
  inoperante: "Inoperante",
  desativado: "Desativado",
};

export const STATUS_ATIVO_COLOR: Record<string, string> = {
  operacional: "text-green-600 bg-green-50",
  em_manutencao: "text-amber-600 bg-amber-50",
  inoperante: "text-red-600 bg-red-50",
  desativado: "text-gray-500 bg-gray-100",
};

export type Ativo = {
  id: string;
  nome: string;
  categoria: string;
  torre: string | null;
  local: string | null;
  codigo_interno: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_patrimonio: string | null;
  data_instalacao: string | null;
  observacoes: string | null;
  foto_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  nivel: number;
  tipo: TipoAtivo;
  status_ativo: StatusAtivo;
  ultima_manutencao: string | null;
  proxima_preventiva: string | null;
  empresa_responsavel: string | null;
  numero_serie: string | null;
  garantia_ate: string | null;
  manual_path: string | null;
  children?: Ativo[];
};

export async function listAtivos(): Promise<Ativo[]> {
  const { data, error } = await supabase
    .from("ativos" as never)
    .select("*")
    .order("torre", { ascending: true })
    .order("nivel", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Ativo[];
}

export async function listAtivosTree(): Promise<Ativo[]> {
  const flat = await listAtivos();
  const byId = new Map<string, Ativo>();
  flat.forEach(a => byId.set(a.id, { ...a, children: [] }));
  const roots: Ativo[] = [];
  for (const a of byId.values()) {
    if (a.parent_id && byId.has(a.parent_id)) {
      byId.get(a.parent_id)!.children!.push(a);
    } else {
      roots.push(a);
    }
  }
  const sortRec = (list: Ativo[]) => {
    list.sort((x, y) => {
      // Locais primeiro, depois por nome
      if (x.tipo !== y.tipo) {
        if (x.tipo === "local") return -1;
        if (y.tipo === "local") return 1;
      }
      return x.nome.localeCompare(y.nome, "pt-BR");
    });
    list.forEach(x => x.children && sortRec(x.children));
  };
  sortRec(roots);
  return roots;
}

/** Retorna o caminho hierárquico (do raiz até o nó) como array de nomes. */
export function ativoPath(id: string, flat: Ativo[]): Ativo[] {
  const byId = new Map(flat.map(a => [a.id, a]));
  const path: Ativo[] = [];
  let cur = byId.get(id) ?? null;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) ?? null : null;
  }
  return path;
}

export async function getAtivo(id: string): Promise<Ativo | null> {
  const { data, error } = await supabase
    .from("ativos" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Ativo) ?? null;
}

export async function createAtivo(values: Partial<Ativo>): Promise<Ativo> {
  const { data: userData } = await supabase.auth.getUser();
  const payload: Record<string, unknown> = { ...values, created_by: userData.user?.id ?? null };
  // Calcular nivel automaticamente com base no parent
  if (values.parent_id) {
    const parent = await getAtivo(values.parent_id);
    payload.nivel = (parent?.nivel ?? 0) + 1;
    if (parent && !values.torre) payload.torre = parent.torre;
  } else {
    payload.nivel = 0;
  }
  const { data, error } = await supabase
    .from("ativos" as never)
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Ativo;
}

export async function updateAtivo(id: string, values: Partial<Ativo>): Promise<Ativo> {
  const { data, error } = await supabase
    .from("ativos" as never)
    .update(values as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Ativo;
}

export async function deleteAtivo(id: string): Promise<void> {
  const { error } = await supabase.from("ativos" as never).delete().eq("id", id);
  if (error) throw error;
}

export function ativoLabel(a: Pick<Ativo, "nome" | "torre">): string {
  return a.torre && a.torre !== "Geral" ? `${a.nome} — ${a.torre}` : a.nome;
}

export type AtivoHistorico = {
  total: number;
  ativas: number;
  concluidas: number;
  emergenciais: number;
  ultima: { id: string; numero_chamado: string; data: string | null; status: string; descricao: string } | null;
  proxima: { id: string; numero_chamado: string; data: string | null; descricao: string } | null;
  mtbfDias: number | null;
  manutencoes: Array<{
    id: string;
    numero_chamado: string;
    descricao: string;
    status: string;
    prioridade: string;
    categoria: string;
    created_at: string;
    data_conclusao: string | null;
    data_prevista: string | null;
  }>;
};

export async function getAtivoHistorico(ativoId: string): Promise<AtivoHistorico> {
  const { data, error } = await supabase
    .from("manutencoes")
    .select("id, numero_chamado, descricao, status, prioridade, categoria, created_at, data_conclusao, data_prevista")
    .eq("ativo_id", ativoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (data ?? []) as AtivoHistorico["manutencoes"];

  const concluidas = list.filter(m => m.status === "Concluído");
  const ativas = list.filter(m => m.status !== "Concluído");
  const emergenciais = list.filter(m => m.prioridade === "Emergencial");

  const ultima = concluidas[0]
    ? { id: concluidas[0].id, numero_chamado: concluidas[0].numero_chamado, data: concluidas[0].data_conclusao, status: concluidas[0].status, descricao: concluidas[0].descricao }
    : null;

  const futuras = ativas
    .filter(m => m.data_prevista && new Date(m.data_prevista).getTime() >= Date.now())
    .sort((a, b) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime());
  const proxima = futuras[0]
    ? { id: futuras[0].id, numero_chamado: futuras[0].numero_chamado, data: futuras[0].data_prevista, descricao: futuras[0].descricao }
    : null;

  let mtbfDias: number | null = null;
  const datasConc = concluidas
    .map(m => m.data_conclusao ? parseDateOnly(m.data_conclusao).getTime() : null)
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  if (datasConc.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < datasConc.length; i++) diffs.push(datasConc[i] - datasConc[i - 1]);
    const avgMs = diffs.reduce((s, n) => s + n, 0) / diffs.length;
    mtbfDias = Math.round(avgMs / (1000 * 60 * 60 * 24));
  }

  return {
    total: list.length,
    ativas: ativas.length,
    concluidas: concluidas.length,
    emergenciais: emergenciais.length,
    ultima,
    proxima,
    mtbfDias,
    manutencoes: list,
  };
}

/** Ativo + histórico completo de manutenções vinculadas. */
export async function getAtivoComHistorico(id: string): Promise<{
  ativo: Ativo;
  manutencoes: AtivoHistorico["manutencoes"];
}> {
  const ativo = await getAtivo(id);
  if (!ativo) throw new Error("Ativo não encontrado");
  const h = await getAtivoHistorico(id);
  return { ativo, manutencoes: h.manutencoes };
}
