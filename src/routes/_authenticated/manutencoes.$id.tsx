import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ManutencaoForm } from "@/components/ManutencaoForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { type Manutencao, formatDate, localLabel, nomesEquipe } from "@/lib/manutencoes";
import { useEquipe } from "@/hooks/use-equipe";
import { FileText, Trash2, ArrowLeft, History, HardHat } from "lucide-react";

import { useState } from "react";
import { SignedImage, Lightbox } from "@/components/SignedImage";
import { useIsAdmin, useAllowedTorres } from "@/hooks/use-role";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/manutencoes/$id")({ component: DetailPage });

function DetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isAdmin = useIsAdmin();
  const allowedTorres = useAllowedTorres();

  const { data, isLoading } = useQuery({
    queryKey: ["manutencao", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("manutencoes").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Manutencao;
    },
  });

  const { equipe } = useEquipe(id);
  const nomes = data ? nomesEquipe(data, equipe) : [];


  async function save(values: Partial<Manutencao>) {
    setSaving(true);
    try {
      const { error } = await supabase.from("manutencoes").update(values as never).eq("id", id);
      if (error) throw error;
      toast.success("Alterações salvas.");
      qc.invalidateQueries({ queryKey: ["manutencao", id] });
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
    } catch (e) {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    setConfirmDelete(true);
  }

  async function confirmRemove() {
    const { error } = await supabase.from("manutencoes").delete().eq("id", id);
    if (error) { toast.error("Não foi possível salvar. Tente novamente."); return; }
    toast.success("Excluído com sucesso.");
    qc.invalidateQueries({ queryKey: ["manutencoes"] });
    navigate({ to: "/manutencoes" });
  }

  if (isLoading || !data) {
    return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;
  }

  async function openImg(path: string) {
    const { data } = await supabase.storage.from("manutencoes").createSignedUrl(path, 3600);
    if (data?.signedUrl) setLightbox(data.signedUrl);
  }

  const concluido = data.status === "Concluído";
  const canEdit = isAdmin || !concluido;
  const localTxt = localLabel(data);


  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/manutencoes" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link to="/local/$local" params={{ local: data.local_manutencao }} className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 hover:bg-muted">
            <History className="h-4 w-4" /> Histórico do Local
          </Link>
          <Link to="/manutencoes/os/$id" params={{ id: data.id }} className="inline-flex items-center gap-2 text-sm bg-gold text-gold-foreground rounded-md px-4 py-2 font-semibold hover:opacity-90">
            <FileText className="h-4 w-4" /> Gerar Ordem de Serviço
          </Link>
          {isAdmin && (
            <Button variant="outline" onClick={remove} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4 mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Chamado {data.numero_chamado}</div>
            <h1 className="font-display text-2xl font-bold text-primary">{data.descricao.slice(0, 80)}{data.descricao.length > 80 ? "…" : ""}</h1>
            <div className="text-xs text-muted-foreground mt-1">{localTxt} · {data.categoria} · {data.prioridade}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">OS</div>
            <div className="font-mono font-bold text-primary">{data.numero_os}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Mini label="Local" value={data.local_manutencao} />
          <Mini label={data.local_manutencao === "Geral" ? "Área Comum" : (data.area_comum === "Apartamento" ? `Apartamento ${data.unidade ?? "—"}` : "Detalhe")} value={data.local_manutencao === "Geral" ? (data.area_comum ?? "—") : (data.area_comum === "Apartamento" ? (data.unidade ?? "—") : (data.area_comum ?? "—"))} />

          <Mini label="Status" value={data.status} />
          <div className="sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
              {nomes.length > 1 ? "Equipe Responsável" : "Responsável"}
            </div>
            {nomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nomes.map(n => (
                  <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-primary">
                    <HardHat className="h-3.5 w-3.5 text-gold" /> {n}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Mini label="Vistoria" value={formatDate(data.data_vistoria)} />
          <Mini label="Início" value={formatDate(data.data_inicio)} />
          <Mini label="Conclusão" value={formatDate(data.data_conclusao)} />
          <Mini label="Categoria" value={data.categoria} />
        </div>

      </Card>

      {(data.foto_antes.length > 0 || data.foto_depois.length > 0) && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Comparação Antes × Depois</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <PhotoCol title="📸 Antes" items={data.foto_antes} onOpen={openImg} />
            <PhotoCol title="📸 Depois" items={data.foto_depois} onOpen={openImg} />
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold mb-4">
          {canEdit ? "Editar Manutenção" : "Visualização (somente leitura — chamado concluído)"}
        </h2>
        {canEdit ? (
          <ManutencaoForm initial={data} onSubmit={save} saving={saving} allowedTorres={allowedTorres} />
        ) : (
          <p className="text-sm text-muted-foreground">Apenas administradores podem editar chamados concluídos.</p>
        )}
      </Card>

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o chamado <b>{data.numero_chamado}</b>? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemove}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-gold pl-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-semibold text-primary">{value}</div>
    </div>
  );
}

function PhotoCol({ title, items, onOpen }: { title: string; items: { path: string; name: string }[]; onOpen: (p: string) => void }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="h-40 grid place-items-center border-2 border-dashed rounded text-xs text-muted-foreground">
          Sem fotos
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map(f => (
            <SignedImage
              key={f.path}
              path={f.path}
              alt={f.name}
              className="w-full h-40 object-cover rounded border cursor-zoom-in hover:opacity-90"
              onClick={() => onOpen(f.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
