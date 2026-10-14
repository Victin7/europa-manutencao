import { TIMELINE_STEPS, type TimelineEventKey } from "@/lib/prestadores";
import { Button } from "@/components/ui/button";
import { formatDateTime, type TimelineEventRef } from "@/lib/manutencoes";

type Props = {
  events: TimelineEventRef[];
  onAdd?: (key: TimelineEventKey) => void;
  readOnly?: boolean;
};

export function TimelineServico({ events, onAdd, readOnly }: Props) {
  const evByKey = new Map<string, TimelineEventRef>();
  for (const e of events) evByKey.set(e.evento, e);

  return (
    <div className="space-y-3">
      <ol className="relative border-l-2 border-border ml-3 space-y-3">
        {TIMELINE_STEPS.map(step => {
          const ev = evByKey.get(step.key);
          const done = !!ev;
          return (
            <li key={step.key} className="ml-4">
              <span
                className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  done ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {step.emoji}
              </span>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>
                    {step.label}
                  </div>
                  {ev && (
                    <div className="text-xs text-muted-foreground">{formatDateTime(ev.at)}</div>
                  )}
                </div>
                {!done && !readOnly && onAdd && (
                  <Button size="sm" variant="outline" type="button" onClick={() => onAdd(step.key)}>
                    Registrar
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
