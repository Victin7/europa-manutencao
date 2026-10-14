import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeManutencoes() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("manutencoes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "manutencoes" }, () => {
        qc.invalidateQueries({ queryKey: ["manutencoes"] });
        qc.invalidateQueries({ queryKey: ["manutencao"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "manutencao_equipe" }, () => {
        qc.invalidateQueries({ queryKey: ["equipe"] });
        qc.invalidateQueries({ queryKey: ["todas-equipes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}
