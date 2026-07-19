import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValuationBadgeProps {
  hasValuation?: boolean;
  confidence?: number;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * ValuationBadge - Displays AI valuation indicator on property cards
 * 
 * Shows when a property has an AI-powered valuation available
 */
export function ValuationBadge({ 
  hasValuation = true, 
  confidence = 0.85,
  className,
  variant = "default"
}: ValuationBadgeProps) {
  if (!hasValuation) return null;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "text-green-600";
    if (conf >= 0.6) return "text-orange-600";
    return "text-gray-600";
  };

  if (variant === "compact") {
    return (
      <Badge 
        variant="secondary" 
        className={cn("gap-1 bg-primary/10 text-primary border-primary/20", className)}
      >
        <Sparkles className="h-3 w-3" />
        AI Valued
      </Badge>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "gap-1.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-primary/20",
        className
      )}
    >
      <TrendingUp className="h-3.5 w-3.5" />
      <span className="font-semibold">AI Valuation</span>
      <span className={cn("text-xs", getConfidenceColor(confidence))}>
        {(confidence * 100).toFixed(0)}%
      </span>
    </Badge>
  );
}
