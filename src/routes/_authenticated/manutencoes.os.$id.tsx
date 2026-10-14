import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Manutencao, formatDate, formatDateTime, localLabel, localLinhas, nomesEquipe } from "@/lib/manutencoes";
import { useEquipe } from "@/hooks/use-equipe";
import { Building2, Printer, Download, Mail, ArrowLeft, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SignedImage } from "@/components/SignedImage";

export const Route = createFileRoute("/_authenticated/manutencoes/os/$id")({ component: OSPage });

function OSPage() {
  const { id } = Route.useParams();
  const [printed, setPrinted] = useState(false);
  const { equipe } = useEquipe(id);

  const { data, isLoading } = useQuery({
    queryKey: ["manutencao", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("manutencoes").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Manutencao;
    },
  });

  async function markPrinted() {
    if (printed || !data || data.data_impressao) return;
    setPrinted(true);
    await supabase.from("manutencoes").update({ data_impressao: new Date().toISOString() } as never).eq("id", id);
  }

  useEffect(() => {
    const handler = () => markPrinted();
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  });

  function printIt() { window.print(); }

  function shareEmail() {
    if (!data) return;
    const localTxt = localLabel(data);

    const subject = encodeURIComponent(`Ordem de Serviço ${data.numero_os} — ${localTxt}`);
    const body = encodeURIComponent(
      `Ordem de Serviço: ${data.numero_os}\n` +
      `Chamado: ${data.numero_chamado}\n` +
      `Local: ${localTxt}\n` +
      `Categoria: ${data.categoria}\n` +
      `Prioridade: ${data.prioridade}\n` +
      `Status: ${data.status}\n` +
      `Responsável: ${nomesEquipe(data, equipe).join(", ") || "—"}\n\n` +
      `Descrição:\n${data.descricao}\n\n` +
      `Link: ${window.location.href}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  if (isLoading || !data) {
    return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to="/manutencoes/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar ao chamado
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={shareEmail}><Mail className="h-4 w-4 mr-2" /> Compartilhar</Button>
          <Button variant="outline" onClick={printIt}><Download className="h-4 w-4 mr-2" /> Exportar PDF</Button>
          <Button onClick={printIt} className="bg-primary"><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
        </div>
      </div>

      <OSPrint m={data} nomes={nomesEquipe(data, equipe)} />
    </div>
  );
}

export function OSPrint({ m, nomes }: { m: Manutencao; nomes?: string[] }) {
  const nomesEquipeOS = nomes ?? (m.funcionario ? [m.funcionario] : []);
  const linhas = localLinhas(m);
  return (
    <Card className="p-8 print-page bg-white text-black">
      <header className="flex items-start justify-between border-b-2 border-primary pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-md bg-primary grid place-items-center text-primary-foreground">
            <Building2 className="h-9 w-9" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--gold)] font-bold">Condomínio Europa</div>
            <div className="font-display text-2xl font-bold text-primary leading-tight">Europa Manutenção</div>
            <div className="text-xs text-muted-foreground">Sistema de Controle de Manutenção Predial</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Ordem de Serviço</div>
          <div className="font-mono font-bold text-3xl text-primary">{m.numero_os}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Chamado <span className="font-semibold text-gold">{m.numero_chamado}</span></div>
          <div className="text-[10px] text-muted-foreground">Emitida em {formatDateTime(new Date().toISOString())}</div>
        </div>
      </header>

      <Section title="Local da Manutenção">
        <div className="grid grid-cols-2 gap-3">
          <Info label="Local" value={linhas.linha1} />
          <Info label="Detalhe" value={linhas.linha2} />
        </div>
      </Section>


      <Section title="Informações do Chamado">
        <div className="grid grid-cols-2 gap-3">
          <Info label="Categoria" value={m.categoria} />
          <Info label="Prioridade" value={m.prioridade} />
          <Info label="Status" value={m.status} />
          <Info label="Data da Vistoria" value={formatDate(m.data_vistoria)} />
          <Info label="Data de Abertura" value={formatDateTime(m.created_at)} />
          <Info label="Data de Início" value={formatDate(m.data_inicio)} />
          <Info label="Data de Conclusão" value={m.data_conclusao ? formatDateTime(m.data_conclusao) : "—"} />
          <Info label="Última Impressão" value={m.data_impressao ? formatDateTime(m.data_impressao) : "—"} />
        </div>
      </Section>

      <Section title={nomesEquipeOS.length > 1 ? "Equipe Responsável" : "Responsável"}>
        {nomesEquipeOS.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {nomesEquipeOS.map(n => (
              <p key={n} className="text-sm inline-flex items-center gap-1.5">
                <HardHat className="h-3.5 w-3.5 text-[color:var(--gold)]" /> {n}
              </p>
            ))}
          </div>
        )}
      </Section>

      <Section title="Descrição do Serviço">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.descricao}</p>
      </Section>

      {m.observacao && (
        <Section title="Observações">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.observacao}</p>
        </Section>
      )}

      {(m.foto_antes.length > 0 || m.foto_depois.length > 0) && (
        <Section title="Comparação Antes × Depois">
          <div className="grid grid-cols-2 gap-4">
            <PhotoGrid title="ANTES" items={m.foto_antes} />
            <PhotoGrid title="DEPOIS" items={m.foto_depois} />
          </div>
        </Section>
      )}

      {m.fotos.length > 0 && (
        <Section title="Fotos do Serviço">
          <div className="grid grid-cols-3 gap-2">
            {m.fotos.map(f => (
              <SignedImage key={f.path} path={f.path} alt={f.name} className="w-full h-32 object-cover rounded border" />
            ))}
          </div>
        </Section>
      )}

      <div className="mt-12 grid grid-cols-2 gap-12 pt-8">
        <SignatureLine label="Funcionário Responsável" />
        <SignatureLine label="Síndico / Administração" />
      </div>

      <footer className="mt-8 pt-4 border-t text-center text-[10px] text-muted-foreground">
        Condomínio Europa · Sistema Europa Manutenção · Documento gerado em {formatDateTime(new Date().toISOString())}
      </footer>
    </Card>
  );
}

function PhotoGrid({ title, items }: { title: string; items: { path: string; name: string }[] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gold mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="h-32 grid place-items-center border border-dashed rounded text-xs text-muted-foreground">Sem fotos</div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {items.map(f => (
            <SignedImage key={f.path} path={f.path} alt={f.name} className="w-full h-28 object-cover rounded border" />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs uppercase tracking-wider font-bold text-[color:var(--gold)] mb-2 border-b pb-1">{title}</div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-[color:var(--gold)] pl-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-semibold text-primary">{value}</div>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="border-t border-foreground/40 pt-2 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
