import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="h-14 w-14 rounded-full bg-muted grid place-items-center">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg text-primary">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {actionLabel && (
        <div className="pt-2">
          {actionTo ? (
            <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to={actionTo}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction} className="bg-gold text-gold-foreground hover:bg-gold/90">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
