import { useState } from "react";
import { X, Plus, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MembroEquipe } from "@/lib/manutencoes";

interface EquipeChipsProps {
  equipe: MembroEquipe[];
  onAdicionar: (nome: string) => void;
  onRemover: (nome: string) => void;
  loading?: boolean;
  readonly?: boolean;
}

export function EquipeChips({ equipe, onAdicionar, onRemover, loading, readonly }: EquipeChipsProps) {
  const [input, setInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  function handleAdicionar() {
    const nome = input.trim();
    if (!nome) return;
    const jaExiste = equipe.some(m => m.nome_funcionario.toLowerCase() === nome.toLowerCase());
    if (jaExiste) {
      setInput("");
      return;
    }
    onAdicionar(nome);
    setInput("");
    setShowInput(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {equipe.length === 0 && (
          <span className="text-xs text-muted-foreground">Nenhum funcionário adicionado.</span>
        )}
        {equipe.map(m => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-primary transition-colors"
          >
            <HardHat className="h-3.5 w-3.5 text-gold" />
            {m.nome_funcionario}
            {!readonly && (
              <button
                type="button"
                onClick={() => onRemover(m.nome_funcionario)}
                className="ml-1 hover:text-destructive transition-colors"
                aria-label={`Remover ${m.nome_funcionario}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
      </div>

      {!readonly &&
        (showInput ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              autoFocus
              value={input}
              placeholder="Nome do funcionário"
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdicionar();
                }
                if (e.key === "Escape") {
                  setShowInput(false);
                  setInput("");
                }
              }}
              className="h-8 text-sm max-w-[220px]"
            />
            <Button type="button" size="sm" className="h-8" disabled={loading} onClick={handleAdicionar}>
              Adicionar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setShowInput(false);
                setInput("");
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowInput(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar funcionário
          </Button>
        ))}
    </div>
  );
}
