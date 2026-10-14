type Props = { tipo?: string | null; className?: string };

export function TipoServicoBadge({ tipo, className = "" }: Props) {
  const terceirizado = tipo === "terceirizado";
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border";
  const cls = terceirizado
    ? "bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)] border-[color:var(--chart-3)]/30"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`${base} ${cls} ${className}`}>
      {terceirizado ? <>🏢 Terceirizada</> : <>👷 Interno</>}
    </span>
  );
}
