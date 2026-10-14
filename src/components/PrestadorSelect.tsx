import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPrestadores, statusInfo } from "@/lib/prestadores";

type Props = {
  value: string | null | undefined;
  onChange: (id: string | null, nomeEmpresa?: string, responsavel?: string | null) => void;
  placeholder?: string;
};

export function PrestadorSelect({ value, onChange, placeholder = "Selecione a empresa" }: Props) {
  const { data: prestadores = [] } = useQuery({ queryKey: ["prestadores"], queryFn: listPrestadores });
  const ativos = prestadores.filter(p => p.status !== "inativa");

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => {
        const p = prestadores.find(x => x.id === v);
        onChange(v, p?.nome_empresa, p?.responsavel ?? null);
      }}
    >
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        {ativos.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum prestador cadastrado.</div>
        ) : (
          ativos.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {statusInfo(p.status).emoji} {p.nome_empresa} · {p.categoria}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
