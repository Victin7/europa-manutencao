import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnexoUploader } from "./AnexoUploader";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORIAS_PRESTADOR, STATUS_PRESTADOR,
  type Prestador,
} from "@/lib/prestadores";
import type { AnexoRef } from "@/lib/manutencoes";

type Props = {
  initial?: Prestador;
  onSubmit: (values: Partial<Prestador>) => void | Promise<void>;
  saving?: boolean;
};

export function PrestadorForm({ initial, onSubmit, saving }: Props) {
  const [nome, setNome] = useState(initial?.nome_empresa ?? "");
  const [responsavel, setResponsavel] = useState(initial?.responsavel ?? "");
  const [cnpj, setCnpj] = useState(initial?.cnpj ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "Outros");
  const [status, setStatus] = useState(initial?.status ?? "ativa");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [documentos, setDocumentos] = useState<AnexoRef[]>(initial?.documentos ?? []);
  const [logo, setLogo] = useState<AnexoRef[]>(
    initial?.logo_path ? [{ path: initial.logo_path, name: "logo" }] : [],
  );

  useEffect(() => {
    if (!initial) return;
    setNome(initial.nome_empresa);
    setResponsavel(initial.responsavel ?? "");
    setCnpj(initial.cnpj ?? "");
    setTelefone(initial.telefone ?? "");
    setWhatsapp(initial.whatsapp ?? "");
    setEmail(initial.email ?? "");
    setCategoria(initial.categoria);
    setStatus(initial.status);
    setObservacoes(initial.observacoes ?? "");
    setDocumentos(initial.documentos ?? []);
    setLogo(initial.logo_path ? [{ path: initial.logo_path, name: "logo" }] : []);
  }, [initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = "Nome da empresa é obrigatório.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      novosErros.email = "Informe um e-mail válido.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      toast.error("Verifique os campos obrigatórios destacados.");
      const primeiroErro = document.querySelector("[data-erro='true']");
      (primeiroErro as HTMLElement | null)?.focus();
      return;
    }
    await onSubmit({
      nome_empresa: nome.trim(),
      responsavel: responsavel.trim() || null,
      cnpj: cnpj.trim() || null,
      telefone: telefone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      categoria,
      status: status as Prestador["status"],
      observacoes: observacoes.trim() || null,
      documentos,
      logo_path: logo[0]?.path ?? null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Identificação">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nome da Empresa *">
            <Input
              value={nome}
              data-erro={!!erros.nome}
              aria-invalid={!!erros.nome}
              className={erros.nome ? "border-[color:var(--danger)]" : undefined}
              onChange={e => {
                setNome(e.target.value);
                if (erros.nome) setErros(prev => ({ ...prev, nome: "" }));
              }}
              required
            />
            {erros.nome && <p className="text-xs text-[color:var(--danger)] mt-1">{erros.nome}</p>}
          </Field>
          <Field label="Responsável">
            <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </Field>
          <Field label="CNPJ">
            <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Categoria">
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS_PRESTADOR.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={(v) => setStatus(v as Prestador["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_PRESTADOR.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Contato">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Telefone">
            <Input value={telefone} onChange={e => setTelefone(e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={email}
              data-erro={!!erros.email}
              aria-invalid={!!erros.email}
              className={erros.email ? "border-[color:var(--danger)]" : undefined}
              onChange={e => {
                setEmail(e.target.value);
                if (erros.email) setErros(prev => ({ ...prev, email: "" }));
              }}
            />
            {erros.email && <p className="text-xs text-[color:var(--danger)] mt-1">{erros.email}</p>}
          </Field>
        </div>
      </Section>

      <Section title="Logo e Documentos">
        <div className="grid md:grid-cols-2 gap-4">
          <AnexoUploader
            title="Logo da Empresa"
            prefix="prestadores/logo"
            multiple={false}
            items={logo}
            onChange={setLogo}
          />
          <AnexoUploader
            title="Contratos / Documentos"
            prefix="prestadores/docs"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            items={documentos}
            onChange={setDocumentos}
            preview="list"
          />
        </div>
      </Section>

      <Section title="Observações">
        <Textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
      </Section>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={saving} className="bg-gold text-gold-foreground hover:bg-gold/90">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gold border-b pb-1">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
