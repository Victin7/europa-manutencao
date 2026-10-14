import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ManutencaoForm } from "@/components/ManutencaoForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { type Manutencao, adicionarMembro } from "@/lib/manutencoes";
import { useAllowedTorres } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/manutencoes/nova")({
  validateSearch: (s: Record<string, unknown>) => ({
    ativo: typeof s.ativo === "string" ? s.ativo : undefined,
  }),
  component: NovaPage,
});

function NovaPage() {
  const navigate = useNavigate();
  const allowedTorres = useAllowedTorres();
  const { ativo } = Route.useSearch();
  const [saving, setSaving] = useState(false);


  async function save(values: Partial<Manutencao>, membros: string[] = []) {
    setSaving(true);
    const payload = values;
    try {
      const { data, error } = await supabase
        .from("manutencoes")
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      const novoId = (data as { id: string }).id;
      if (membros.length > 0) {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id ?? null;
        for (const nome of membros) {
          await adicionarMembro(novoId, nome, userId);
        }
      }
      toast.success(`Manutenção ${(data as { numero_chamado: string }).numero_chamado} criada`);
      navigate({ to: "/manutencoes/$id", params: { id: novoId } });
    } catch (e) {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Nova Ordem de Serviço</div>
          <h1 className="font-display text-3xl font-bold text-primary">Cadastrar Manutenção</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/manutencoes" })}
          disabled={saving}
        >
          Cancelar
        </Button>
      </header>
      <Card className="p-6">
        <ManutencaoForm
          onSubmit={save}
          saving={saving}
          allowedTorres={allowedTorres}
          initial={ativo ? ({ ativo_id: ativo } as unknown as Manutencao) : undefined}
        />

      </Card>
    </div>
  );
}
