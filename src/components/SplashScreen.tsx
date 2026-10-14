import { useEffect, useState } from "react";
import europaLogo from "@/assets/europa-logo.png.asset.json";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1400);
    const hideTimer = setTimeout(() => setVisible(false), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--gold) 25%, transparent) 0%, transparent 45%), radial-gradient(circle at 75% 75%, color-mix(in oklab, var(--gold) 20%, transparent) 0%, transparent 55%)",
      }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-gold/30">
          <img
            src={europaLogo.url}
            alt="Europa Manutenção"
            className="h-32 w-32 object-contain md:h-40 md:w-40"
          />
        </div>
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.35em] text-gold">
            Condomínio Europa
          </div>
          <div className="mt-1 font-display text-3xl font-bold text-primary-foreground md:text-4xl">
            Europa Manutenção
          </div>
        </div>
        <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-primary-foreground/10">
          <div className="h-full w-full origin-left animate-[loadbar_1.4s_ease-out_forwards] bg-gold" />
        </div>
      </div>
      <style>{`
        @keyframes loadbar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
