import { Star } from "lucide-react";

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
};

export function AvaliacaoStars({ value, onChange, size = 20, readOnly = false }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(i)}
            className={`${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
            aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
          >
            <Star
              width={size}
              height={size}
              className={filled ? "fill-gold text-gold" : "text-muted-foreground/40"}
            />
          </button>
        );
      })}
    </div>
  );
}
