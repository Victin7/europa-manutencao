import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEquipe, adicionarMembro, removerMembro } from "@/lib/manutencoes";
import { toast } from "sonner";

export function useEquipe(manutencaoId: string | null) {
  const qc = useQueryClient();

  const { data: equipe = [], isLoading } = useQuery({
    queryKey: ["equipe", manutencaoId],
    queryFn: () => fetchEquipe(manutencaoId!),
    enabled: !!manutencaoId,
  });

  const adicionar = useMutation({
    mutationFn: async ({ nome, userId }: { nome: string; userId: string | null }) => {
      const { error } = await adicionarMembro(manutencaoId!, nome, userId);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipe", manutencaoId] });
      toast.success("Funcionário adicionado à equipe.");
    },
    onError: () => toast.error("Não foi possível adicionar o funcionário."),
  });

  const remover = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await removerMembro(manutencaoId!, nome);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipe", manutencaoId] });
      toast.success("Funcionário removido da equipe.");
    },
    onError: () => toast.error("Não foi possível remover o funcionário."),
  });

  return { equipe, isLoading, adicionar, remover };
}
