import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import type { AnexoRef } from "@/lib/manutencoes";
import { SignedImage, Lightbox } from "./SignedImage";

type Props = {
  title: string;
  prefix: string; // storage subfolder
  accept?: string;
  multiple?: boolean;
  items: AnexoRef[];
  onChange: (items: AnexoRef[]) => void;
  preview?: "image" | "list";
};

export function AnexoUploader({ title, prefix, accept = "image/*", multiple = true, items, onChange, preview = "image" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const next: AnexoRef[] = multiple ? [...items] : [];
      for (const f of files) {
        const path = `${prefix}/${crypto.randomUUID()}-${f.name}`;
        const { error } = await supabase.storage.from("manutencoes").upload(path, f);
        if (error) throw error;
        next.push({ path, name: f.name });
        if (!multiple) break;
      }
      onChange(next);
      toast.success("Arquivo enviado com sucesso.");
    } catch (err) {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function remove(p: string) {
    await supabase.storage.from("manutencoes").remove([p]);
    onChange(items.filter((i) => i.path !== p));
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <label className="cursor-pointer text-[11px] px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
          {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
          + Anexar
          <input type="file" multiple={multiple} accept={accept} className="hidden" onChange={handle} />
        </label>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum arquivo.</p>
      ) : preview === "image" ? (
        <div className="grid grid-cols-3 gap-2">
          {items.map((f) => (
            <div key={f.path} className="relative group">
              <SignedImage path={f.path} alt={f.name} className="w-full h-24 object-cover rounded border cursor-zoom-in" onClick={() => openSignedUrl(f.path, setLightbox)} />
              <button type="button" onClick={() => remove(f.path)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-2 text-xs bg-card px-2 py-1.5 rounded border">
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => remove(f.path)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

async function openSignedUrl(path: string, setLightbox: (u: string) => void) {
  const { data } = await supabase.storage.from("manutencoes").createSignedUrl(path, 3600);
  if (data?.signedUrl) setLightbox(data.signedUrl);
}
