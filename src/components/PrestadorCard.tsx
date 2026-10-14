import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { statusInfo, type Prestador } from "@/lib/prestadores";
import { SignedImage } from "./SignedImage";
import { Building2, Phone, Mail } from "lucide-react";

type Props = { prestador: Prestador; totalServicos?: number };

export function PrestadorCard({ prestador: p, totalServicos }: Props) {
  const s = statusInfo(p.status);
  return (
    <Link to="/prestadores/$id" params={{ id: p.id }}>
      <Card className="p-4 hover:shadow-md transition-shadow h-full flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-md bg-muted grid place-items-center overflow-hidden shrink-0">
            {p.logo_path ? (
              <SignedImage path={p.logo_path} className="h-14 w-14 object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{p.nome_empresa}</h3>
            </div>
            <div className="text-xs text-muted-foreground truncate">{p.categoria}</div>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-[color:var(--${s.color})]/15 text-[color:var(--${s.color})] border-[color:var(--${s.color})]/30`}>
                {s.emoji} {s.label}
              </span>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          {p.responsavel && <div>👤 {p.responsavel}</div>}
          {p.telefone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.telefone}</div>}
          {p.email && <div className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {p.email}</div>}
        </div>
        {typeof totalServicos === "number" && (
          <div className="mt-auto text-xs pt-2 border-t">
            <span className="font-semibold text-primary">{totalServicos}</span>{" "}
            <span className="text-muted-foreground">serviço(s) realizados</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
