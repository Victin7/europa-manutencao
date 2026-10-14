import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrestadorForm } from "@/components/PrestadorForm";
import { getPrestador, updatePrestador, type Prestador } from "@/lib/prestadores";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prestadores/$id/editar")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const { data: prestador } = useQuery({ queryKey: ["prestador", id], queryFn: () => getPrestador(id) });

  async function submit(values: Partial<Prestador>) {
    setSaving(true);
    try {
      await updatePrestador(id, values);
      toast.success("Alterações salvas.");
      nav({ to: "/prestadores/$id", params: { id } });
    } catch (e) {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (!prestador) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Prestadores</div>
          <h1 className="font-display text-3xl font-bold text-primary">Editar Empresa</h1>
        </div>
        <Button variant="outline" onClick={() => nav({ to: "/prestadores/$id", params: { id } })} disabled={saving}>Cancelar</Button>
      </header>
      <Card className="p-6">
        <PrestadorForm initial={prestador} onSubmit={submit} saving={saving} />
      </Card>
    </div>
  );
}
