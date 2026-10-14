import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NONE_LOCAL = "__none__";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CATEGORIAS, PRIORIDADES, STATUSES, LOCAIS, AREAS_COMUNS, TORRES,
  unidadesDaTorre, nomeTorre, subsolosDaTorre, TIPOS_LOCAL_BASE, TIPOS_SUBSOLO_HALLS,
  type AnexoRef, type Manutencao, type TimelineEventRef,
} from "@/lib/manutencoes";
import { PrestadorSelect } from "./PrestadorSelect";
import { AtivoSelect } from "./AtivoSelect";
import { TimelineServico } from "./TimelineServico";
import { EquipeChips } from "./EquipeChips";
import { useEquipe } from "@/hooks/use-equipe";
import type { TimelineEventKey } from "@/lib/prestadores";


import { AnexoUploader } from "./AnexoUploader";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";


type Props = {
  initial?: Manutencao;
  /** `membros` contém os nomes da equipe informados numa nova OS (vazio na edição). */
  onSubmit: (values: Partial<Manutencao>, membros: string[]) => void | Promise<void>;
  saving?: boolean;
  /** Quando definido, restringe os locais (torres) selecionáveis. "Geral" sempre permitido. */
  allowedTorres?: string[] | null;
};

function deriveTipoSub(local: string, areaComum: string | null | undefined): { tipo: string; ssHall: string } {
  if (local === "Geral") return { tipo: "", ssHall: "" };
  const ac = areaComum ?? "";
  const m = ac.match(/^(SS\d)\s*-\s*(.+)$/);
  if (m) return { tipo: m[1], ssHall: m[2] };
  if (TIPOS_LOCAL_BASE.includes(ac as typeof TIPOS_LOCAL_BASE[number])) return { tipo: ac, ssHall: "" };
  return { tipo: "", ssHall: "" };
}

export function ManutencaoForm({ initial, onSubmit, saving, allowedTorres }: Props) {
  const torresVisiveis = useMemo(
    () => (allowedTorres ? TORRES.filter(t => allowedTorres.includes(t.id)) : TORRES),
    [allowedTorres],
  );
  // Equipe (múltiplos funcionários)
  const manutencaoId = initial?.id ?? null;
  const isEdicao = !!manutencaoId;
  const { equipe, adicionar, remover } = useEquipe(manutencaoId);
  const [membrosLocais, setMembrosLocais] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const [local, setLocal] = useState<string>(initial?.local_manutencao ?? "Geral");
  const [unidade, setUnidade] = useState(initial?.unidade ?? "");
  const [areaComum, setAreaComum] = useState(
    initial && initial.local_manutencao === "Geral" ? (initial.area_comum ?? "") : "",
  );
  const initDeriv = deriveTipoSub(initial?.local_manutencao ?? "Geral", initial?.area_comum);
  const [tipoLocal, setTipoLocal] = useState<string>(initDeriv.tipo); // Apartamento | Hall Social | Hall de Serviço | SS1 | SS2 | SS3
  const [subsoloHall, setSubsoloHall] = useState<string>(initDeriv.ssHall); // Hall Social | Hall de Serviço
  const [dataVistoria, setDataVistoria] = useState(initial?.data_vistoria?.slice(0, 10) ?? "");
  const [funcionario, setFuncionario] = useState(initial?.funcionario ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [categoria, setCategoria] = useState<string>(initial?.categoria ?? "Elétrica");
  const [prioridade, setPrioridade] = useState<string>(initial?.prioridade ?? "Média");
  const [status, setStatus] = useState<string>(initial?.status ?? "Pendente");
  const [dataInicio, setDataInicio] = useState(initial?.data_inicio?.slice(0, 10) ?? "");
  const [observacao, setObservacao] = useState(initial?.observacao ?? "");
  const [fotos, setFotos] = useState<AnexoRef[]>(initial?.fotos ?? []);
  const [fotoAntes, setFotoAntes] = useState<AnexoRef[]>(initial?.foto_antes ?? []);
  const [fotoDepois, setFotoDepois] = useState<AnexoRef[]>(initial?.foto_depois ?? []);
  const [documentos, setDocumentos] = useState<AnexoRef[]>(initial?.documentos ?? []);

  // Terceirizada
  const [tipoServico, setTipoServico] = useState<string>(initial?.tipo_servico ?? "interno");
  const [prestadorId, setPrestadorId] = useState<string | null>(initial?.prestador_id ?? null);
  const [prestadorResp, setPrestadorResp] = useState(initial?.prestador_responsavel ?? "");
  const [funcAcomp, setFuncAcomp] = useState(initial?.funcionario_acompanhante ?? "");
  const [dataSolic, setDataSolic] = useState(initial?.data_solicitacao?.slice(0, 10) ?? "");
  const [dataAgend, setDataAgend] = useState(initial?.data_agendada?.slice(0, 16) ?? "");
  const [valorServico, setValorServico] = useState<string>(initial?.valor_servico != null ? String(initial.valor_servico) : "");
  const [garantiaDias, setGarantiaDias] = useState<string>(initial?.garantia_dias != null ? String(initial.garantia_dias) : "");
  const [orcamentos, setOrcamentos] = useState<AnexoRef[]>(initial?.orcamentos ?? []);
  const [notasFiscais, setNotasFiscais] = useState<AnexoRef[]>(initial?.notas_fiscais ?? []);
  const [arts, setArts] = useState<AnexoRef[]>(initial?.arts ?? []);
  const [laudos, setLaudos] = useState<AnexoRef[]>(initial?.laudos ?? []);
  const [relatorios, setRelatorios] = useState<AnexoRef[]>(initial?.relatorios ?? []);
  const [contratos, setContratos] = useState<AnexoRef[]>(initial?.contratos ?? []);
  const [timeline, setTimeline] = useState<TimelineEventRef[]>(initial?.timeline_events ?? []);
  const [ativoId, setAtivoId] = useState<string | null>(initial?.ativo_id ?? null);
  const [localAtivoId, setLocalAtivoId] = useState<string | null>(null);

  const [dataPrevista, setDataPrevista] = useState<string>(
    (initial as { data_prevista?: string | null } | undefined)?.data_prevista?.slice(0, 16) ?? "",
  );

  useEffect(() => {
    if (!initial) return;
    setLocal(initial.local_manutencao ?? "Geral");
    setUnidade(initial.unidade ?? "");
    setAreaComum(initial.local_manutencao === "Geral" ? (initial.area_comum ?? "") : "");
    const d = deriveTipoSub(initial.local_manutencao ?? "Geral", initial.area_comum);
    setTipoLocal(d.tipo);
    setSubsoloHall(d.ssHall);
    setDataVistoria(initial.data_vistoria?.slice(0, 10) ?? "");
    setFuncionario(initial.funcionario ?? "");
    setDescricao(initial.descricao ?? "");
    setCategoria(initial.categoria);
    setPrioridade(initial.prioridade);
    setStatus(initial.status);
    setDataInicio(initial.data_inicio?.slice(0, 10) ?? "");
    setObservacao(initial.observacao ?? "");
    setFotos(initial.fotos ?? []);
    setFotoAntes(initial.foto_antes ?? []);
    setFotoDepois(initial.foto_depois ?? []);
    setDocumentos(initial.documentos ?? []);
    setTipoServico(initial.tipo_servico ?? "interno");
    setPrestadorId(initial.prestador_id ?? null);
    setPrestadorResp(initial.prestador_responsavel ?? "");
    setFuncAcomp(initial.funcionario_acompanhante ?? "");
    setDataSolic(initial.data_solicitacao?.slice(0, 10) ?? "");
    setDataAgend(initial.data_agendada?.slice(0, 16) ?? "");
    setValorServico(initial.valor_servico != null ? String(initial.valor_servico) : "");
    setGarantiaDias(initial.garantia_dias != null ? String(initial.garantia_dias) : "");
    setOrcamentos(initial.orcamentos ?? []);
    setNotasFiscais(initial.notas_fiscais ?? []);
    setArts(initial.arts ?? []);
    setLaudos(initial.laudos ?? []);
    setRelatorios(initial.relatorios ?? []);
    setContratos(initial.contratos ?? []);
    setTimeline(initial.timeline_events ?? []);
    setAtivoId(initial.ativo_id ?? null);
  }, [initial]);

  function addTimelineEvent(key: TimelineEventKey) {
    setTimeline(prev => [...prev, { evento: key, at: new Date().toISOString() }]);
  }

  const isGeral = local === "Geral";
  const unidadesDisponiveis = useMemo(() => isGeral ? [] : unidadesDaTorre(local), [isGeral, local]);
  const subsolosDisponiveis = useMemo(() => isGeral ? [] : subsolosDaTorre(local), [isGeral, local]);
  const isSS = tipoLocal.startsWith("SS");
  const isApto = tipoLocal === "Apartamento";

  // Seleção em cascata: Torre → Local → Ativo
  const { data: locaisDisponiveis = [] } = useQuery({
    queryKey: ["ativos-locais", local],
    enabled: !!local,
    queryFn: async () => {
      const { data } = await supabase
        .from("ativos")
        .select("id, nome, tipo")
        .eq("tipo", "local")
        .eq("torre", local)
        .order("nome");
      return (data ?? []) as Array<{ id: string; nome: string; tipo: string }>;
    },
  });

  const { data: ativosDisponiveis = [] } = useQuery({
    queryKey: ["ativos-filhos", localAtivoId],
    enabled: !!localAtivoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ativos")
        .select("id, nome, tipo, categoria")
        .eq("parent_id", localAtivoId!)
        .order("nome");
      return (data ?? []) as Array<{ id: string; nome: string; tipo: string; categoria: string }>;
    },
  });

  // Ao trocar de torre/local, limpa a cascata
  useEffect(() => {
    setLocalAtivoId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);


  // Quando trocar local entre Geral e torre, limpa campos não relacionados
  useEffect(() => {
    if (isGeral) {
      setUnidade("");
      setTipoLocal("");
      setSubsoloHall("");
    } else {
      setAreaComum("");
    }
  }, [isGeral]);

  // Quando trocar de torre, limpa subtipo se não existir naquela torre
  useEffect(() => {
    if (isGeral) return;
    if (tipoLocal.startsWith("SS") && !subsolosDisponiveis.includes(tipoLocal)) {
      setTipoLocal("");
      setSubsoloHall("");
    }
  }, [local, isGeral, subsolosDisponiveis, tipoLocal]);

  // Quando trocar o tipo, limpa subcampos
  useEffect(() => {
    if (!isApto) setUnidade("");
    if (!isSS) setSubsoloHall("");
  }, [tipoLocal, isApto, isSS]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const isTerc = tipoServico === "terceirizado";
    const novosErros: Record<string, string> = {};
    if (!descricao.trim()) novosErros.descricao = "Descrição é obrigatória.";
    if (isGeral) {
      if (!areaComum) novosErros.areaComum = "Selecione uma área comum.";
    } else {
      if (!tipoLocal) novosErros.tipoLocal = "Selecione o tipo de local.";
      if (isApto && !unidade) novosErros.unidade = "Selecione a unidade do apartamento.";
      if (isSS && !subsoloHall) novosErros.subsoloHall = "Selecione o hall do subsolo.";
    }
    if (isTerc && !prestadorId) novosErros.prestador = "Selecione a empresa prestadora.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      toast.error("Verifique os campos obrigatórios destacados.");
      const primeiroErro = document.querySelector("[data-erro='true']");
      (primeiroErro as HTMLElement | null)?.focus();
      return;
    }

    const areaComumFinal = isGeral
      ? areaComum
      : isSS
        ? `${tipoLocal} - ${subsoloHall}`
        : tipoLocal;

    // Compatibilidade: campo legado `funcionario` recebe o primeiro membro da equipe
    const membros = isEdicao ? equipe.map(m => m.nome_funcionario) : membrosLocais;
    const funcionarioLegado = isTerc
      ? (funcionario.trim() || null)
      : (membros[0] ?? funcionario.trim() ?? null) || null;

    await onSubmit({
      local_manutencao: local,
      torre: isGeral ? null : local,
      unidade: isGeral || !isApto ? null : unidade,
      area_comum: areaComumFinal || null,
      data_vistoria: dataVistoria || null,
      funcionario: funcionarioLegado,

      descricao: descricao.trim(),
      categoria,
      prioridade,
      status,
      data_inicio: dataInicio || null,
      observacao: observacao.trim() || null,
      fotos,
      foto_antes: fotoAntes,
      foto_depois: fotoDepois,
      documentos,
      tipo_servico: tipoServico,
      prestador_id: isTerc ? prestadorId : null,
      prestador_responsavel: isTerc ? (prestadorResp.trim() || null) : null,
      funcionario_acompanhante: isTerc ? (funcAcomp.trim() || null) : null,
      data_solicitacao: isTerc && dataSolic ? new Date(dataSolic).toISOString() : null,
      data_agendada: isTerc && dataAgend ? new Date(dataAgend).toISOString() : null,
      valor_servico: isTerc && valorServico ? Number(valorServico) : null,
      garantia_dias: isTerc && garantiaDias ? Number(garantiaDias) : null,
      orcamentos: isTerc ? orcamentos : [],
      notas_fiscais: isTerc ? notasFiscais : [],
      arts: isTerc ? arts : [],
      laudos: isTerc ? laudos : [],
      relatorios: isTerc ? relatorios : [],
      contratos: isTerc ? contratos : [],
      timeline_events: timeline,
      ativo_id: ativoId,
      data_prevista: dataPrevista ? new Date(dataPrevista).toISOString() : null,
    } as Partial<Manutencao>, isEdicao ? [] : membrosLocais);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="1 · Responsável">
        <RadioGroup value={tipoServico} onValueChange={setTipoServico} className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="interno" id="ts-int-top" />
            <span>👷 Funcionário interno</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="terceirizado" id="ts-terc-top" />
            <span>🏢 Empresa terceirizada</span>
          </label>
        </RadioGroup>
        {tipoServico === "interno" ? (
          <div className="mt-4">
            <Field label="Equipe Responsável">
              <EquipeChips
                equipe={isEdicao ? equipe : membrosLocais.map(n => ({
                  id: n, manutencao_id: manutencaoId ?? "", nome_funcionario: n,
                  adicionado_em: "", adicionado_por: null,
                }))}
                onAdicionar={isEdicao
                  ? (nome) => adicionar.mutate({ nome, userId })
                  : (nome) => setMembrosLocais(p => (p.includes(nome) ? p : [...p, nome]))}
                onRemover={isEdicao
                  ? (nome) => remover.mutate(nome)
                  : (nome) => setMembrosLocais(p => p.filter(n => n !== nome))}
                loading={adicionar.isPending || remover.isPending}
              />
            </Field>
          </div>

        ) : (
          <div className="mt-4">
            <Field label="Empresa prestadora *">
              <PrestadorSelect
                value={prestadorId}
                onChange={(id, nome, resp) => {
                  setPrestadorId(id);
                  if (nome) setFuncionario(nome);
                  if (resp && !prestadorResp) setPrestadorResp(resp);
                }}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section title="2 · Local da Manutenção">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Local *">
            <Select value={local} onValueChange={setLocal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Geral">Geral (Áreas Comuns)</SelectItem>
                {torresVisiveis.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.id} – {t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isGeral ? (
            <Field label="Área Comum *">
              <Select value={areaComum} onValueChange={setAreaComum}>
                <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                <SelectContent>
                  {AREAS_COMUNS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label={`Tipo de Local * (${nomeTorre(local)})`}>
              <Select value={tipoLocal} onValueChange={setTipoLocal}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartamento">Apartamento</SelectItem>
                  <SelectItem value="Hall Social">Hall Social</SelectItem>
                  <SelectItem value="Hall de Serviço">Hall de Serviço</SelectItem>
                  {subsolosDisponiveis.map(ss => (
                    <SelectItem key={ss} value={ss}>{ss}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {!isGeral && isApto && (
            <Field label={`Unidade * (${unidadesDisponiveis.length} disponíveis)`}>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {unidadesDisponiveis.map(u => <SelectItem key={u} value={u}>Apartamento {u}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {!isGeral && isSS && (
            <Field label={`Hall do ${tipoLocal} *`}>
              <Select value={subsoloHall} onValueChange={setSubsoloHall}>
                <SelectTrigger><SelectValue placeholder={`Selecione o hall de ${tipoLocal}`} /></SelectTrigger>
                <SelectContent>
                  {TIPOS_SUBSOLO_HALLS.map(h => (
                    <SelectItem key={h} value={h}>{h} {tipoLocal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {locaisDisponiveis.length > 0 && (
            <Field label="Local / Ambiente (opcional)">
              <Select
                value={localAtivoId ?? NONE_LOCAL}
                onValueChange={v => {
                  setLocalAtivoId(v === NONE_LOCAL ? null : v);
                  setAtivoId(null);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NONE_LOCAL}>— Nenhum —</SelectItem>
                  {locaisDisponiveis.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {localAtivoId && ativosDisponiveis.length > 0 && (
            <Field label="Ativo / Equipamento (opcional)">
              <Select
                value={ativoId ?? NONE_LOCAL}
                onValueChange={v => setAtivoId(v === NONE_LOCAL ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o ativo" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NONE_LOCAL}>— Nenhum —</SelectItem>
                  {ativosDisponiveis.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {(!localAtivoId || ativosDisponiveis.length === 0) && (
            <Field label="Ativo / Patrimônio (opcional)">
              <AtivoSelect value={ativoId} onChange={setAtivoId} torre={local} />
            </Field>
          )}
        </div>

        {(local || localAtivoId || ativoId) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {[
              local,
              locaisDisponiveis.find(l => l.id === localAtivoId)?.nome,
              ativosDisponiveis.find(a => a.id === ativoId)?.nome,
            ].filter(Boolean).join(" → ")}
          </p>
        )}

      </Section>


      {tipoServico === "terceirizado" && (
        <Section title="Dados da Terceirizada">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Responsável (empresa)">
              <Input value={prestadorResp} onChange={e => setPrestadorResp(e.target.value)} />
            </Field>
            <Field label="Funcionário que acompanhou">
              <Input value={funcAcomp} onChange={e => setFuncAcomp(e.target.value)} />
            </Field>
            <Field label="Data da solicitação">
              <Input type="date" value={dataSolic} onChange={e => setDataSolic(e.target.value)} />
            </Field>
            <Field label="Data agendada">
              <Input type="datetime-local" value={dataAgend} onChange={e => setDataAgend(e.target.value)} />
            </Field>
            <Field label="Valor (R$)">
              <Input type="number" step="0.01" value={valorServico} onChange={e => setValorServico(e.target.value)} />
            </Field>
            <Field label="Garantia (dias)">
              <Input type="number" value={garantiaDias} onChange={e => setGarantiaDias(e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      <Section title="3 · Detalhes do chamado">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Categoria">
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status inicial">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Data prevista de execução">
            <Input type="datetime-local" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} />
          </Field>
          <Field label="Data da Vistoria">
            <Input type="date" value={dataVistoria ?? ""} onChange={e => setDataVistoria(e.target.value)} />
          </Field>
          <Field label="Data de Início">
            <Input type="date" value={dataInicio ?? ""} onChange={e => setDataInicio(e.target.value)} />
          </Field>
        </div>
        <Field label="Descrição do serviço *">
          <Textarea
            rows={4}
            value={descricao}
            data-erro={!!erros.descricao}
            aria-invalid={!!erros.descricao}
            className={erros.descricao ? "border-[color:var(--danger)]" : undefined}
            onChange={e => {
              setDescricao(e.target.value);
              if (erros.descricao) setErros(prev => ({ ...prev, descricao: "" }));
            }}
            required
          />
          {erros.descricao && (
            <p className="text-xs text-[color:var(--danger)] mt-1">{erros.descricao}</p>
          )}
        </Field>
        <Field label="Observação inicial">
          <Textarea
            placeholder="Alguma observação inicial sobre este chamado (opcional)..."
            value={observacao ?? ""}
            onChange={e => setObservacao(e.target.value)}
            rows={2}
          />
        </Field>
      </Section>

      <Section title="4 · Fotos">
        <div className="grid md:grid-cols-2 gap-4">
          <AnexoUploader title="📸 Foto Antes" prefix="antes" items={fotoAntes} onChange={setFotoAntes} />
          <AnexoUploader title="📸 Foto Depois" prefix="depois" items={fotoDepois} onChange={setFotoDepois} />
        </div>
      </Section>

      <Section title="Anexos Gerais">
        <div className="grid md:grid-cols-2 gap-4">
          <AnexoUploader title="Fotos do Serviço" prefix="fotos" items={fotos} onChange={setFotos} />
          <AnexoUploader title="Documentos" prefix="docs" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" items={documentos} onChange={setDocumentos} preview="list" />
        </div>
      </Section>

      {tipoServico === "terceirizado" && (
        <>
          <Section title="Anexos da Terceirizada">
            <div className="grid md:grid-cols-2 gap-4">
              <AnexoUploader title="Orçamento" prefix="terc/orcamento" accept=".pdf,.jpg,.jpeg,.png" items={orcamentos} onChange={setOrcamentos} preview="list" />
              <AnexoUploader title="Nota Fiscal" prefix="terc/nf" accept=".pdf,.jpg,.jpeg,.png" items={notasFiscais} onChange={setNotasFiscais} preview="list" />
              <AnexoUploader title="ART" prefix="terc/art" accept=".pdf,.jpg,.jpeg,.png" items={arts} onChange={setArts} preview="list" />
              <AnexoUploader title="Laudos" prefix="terc/laudos" accept=".pdf,.jpg,.jpeg,.png" items={laudos} onChange={setLaudos} preview="list" />
              <AnexoUploader title="Relatórios" prefix="terc/relatorios" accept=".pdf,.jpg,.jpeg,.png" items={relatorios} onChange={setRelatorios} preview="list" />
              <AnexoUploader title="Contrato" prefix="terc/contrato" accept=".pdf,.jpg,.jpeg,.png" items={contratos} onChange={setContratos} preview="list" />
            </div>
          </Section>

          <Section title="Linha do Tempo">
            <TimelineServico events={timeline} onAdd={addTimelineEvent} />
          </Section>
        </>
      )}



      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={saving} className="bg-gold text-gold-foreground hover:brightness-105">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Use LOCAIS to keep import in use for typecheck and document intent */}
      <input type="hidden" value={LOCAIS.join(",")} readOnly hidden />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gold border-b pb-1">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
