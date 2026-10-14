import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvaliacaoStars } from "./AvaliacaoStars";
import { criarAvaliacao, calcNotaGeral } from "@/lib/prestadores";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  prestadorId: string;
  manutencaoId?: string | null;
  onSaved?: () => void;
};

const CRIT = [
  { key: "qualidade", label: "Qualidade" },
  { key: "organizacao", label: "Organização" },
  { key: "prazo", label: "Prazo" },
  { key: "atendimento", label: "Atendimento" },
  { key: "limpeza", label: "Limpeza" },
] as const;

type CritKey = (typeof CRIT)[number]["key"];

export function AvaliacaoForm({ open, onClose, prestadorId, manutencaoId, onSaved }: Props) {
  const [notas, setNotas] = useState<Record<CritKey, number>>({
    qualidade: 0, organizacao: 0, prazo: 0, atendimento: 0, limpeza: 0,
  });
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);

  const notaGeral = calcNotaGeral(notas);

  async function submit() {
    setSaving(true);
    try {
      await criarAvaliacao({
        prestador_id: prestadorId,
        manutencao_id: manutencaoId ?? null,
        ...notas,
        comentario: comentario.trim() || null,
      });
      toast.success("Avaliação registrada com sucesso.");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar Prestador</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {CRIT.map(c => (
            <div key={c.key} className="flex items-center justify-between">
              <Label>{c.label}</Label>
              <AvaliacaoStars value={notas[c.key]} onChange={(v) => setNotas(n => ({ ...n, [c.key]: v }))} />
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-semibold">Nota Geral</span>
            <span className="text-xl font-bold text-gold">{notaGeral.toFixed(2)}</span>
          </div>
          <div className="space-y-1.5">
            <Label>Comentário (opcional)</Label>
            <Textarea rows={3} value={comentario} onChange={e => setComentario(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
