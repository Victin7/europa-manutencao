import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; exp: number }>();

export function useSignedUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (paths.length === 0) { setUrls({}); return; }
    const now = Date.now();
    const need: string[] = [];
    const map: Record<string, string> = {};
    for (const p of paths) {
      const c = cache.get(p);
      if (c && c.exp > now) map[p] = c.url;
      else need.push(p);
    }
    setUrls(map);
    if (need.length === 0) return;
    supabase.storage.from("manutencoes").createSignedUrls(need, 3600).then(({ data }) => {
      if (!data) return;
      const next = { ...map };
      data.forEach((d, i) => {
        if (d.signedUrl) {
          cache.set(need[i], { url: d.signedUrl, exp: now + 3500_000 });
          next[need[i]] = d.signedUrl;
        }
      });
      setUrls(next);
    });
  }, [paths.join("|")]);
  return urls;
}

export function SignedImage({ path, alt, className, onClick }: { path: string; alt?: string; className?: string; onClick?: () => void }) {
  const urls = useSignedUrls([path]);
  const url = urls[path];
  return url ? (
    <img src={url} alt={alt ?? ""} className={className} onClick={onClick} loading="lazy" />
  ) : (
    <div className={`${className} grid place-items-center bg-muted text-xs text-muted-foreground`}>…</div>
  );
}

export function Lightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null;
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4 cursor-zoom-out">
      <img src={url} alt="" className="max-h-full max-w-full object-contain" />
    </div>
  );
}
