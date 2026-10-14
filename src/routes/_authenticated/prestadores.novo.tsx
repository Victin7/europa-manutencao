import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrestadorForm } from "@/components/PrestadorForm";
import { createPrestador, type Prestador } from "@/lib/prestadores";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prestadores/novo")({ component: Page });

function Page() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  async function submit(values: Partial<Prestador>) {
    setSaving(true);
    try {
      const p = await createPrestador(values);
      toast.success("Empresa cadastrada com sucesso.");
      nav({ to: "/prestadores/$id", params: { id: p.id } });
    } catch (e) {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Prestadores</div>
          <h1 className="font-display text-3xl font-bold text-primary">Nova Empresa</h1>
        </div>
        <Button variant="outline" onClick={() => nav({ to: "/prestadores" })} disabled={saving}>Cancelar</Button>
      </header>
      <Card className="p-6">
        <PrestadorForm onSubmit={submit} saving={saving} />
      </Card>
    </div>
  );
}
