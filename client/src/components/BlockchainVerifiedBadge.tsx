import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface BlockchainVerifiedBadgeProps {
  propertyId: number | string;
  variant?: "default" | "compact" | "icon-only";
  className?: string;
  clickable?: boolean;
}

export function BlockchainVerifiedBadge({
  propertyId,
  variant = "default",
  className,
  clickable = true,
}: BlockchainVerifiedBadgeProps) {
  const blockchainUrl = `/blockchain-registry?propertyId=prop_${propertyId}`;

  const BadgeContent = () => {
    switch (variant) {
      case "icon-only":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30",
                clickable && "cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors",
                className
              )}>
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 absolute top-0 right-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Blockchain Verified</p>
              <p className="text-xs text-muted-foreground">Click to view ownership history</p>
            </TooltipContent>
          </Tooltip>
        );

      case "compact":
        return (
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
              clickable && "cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors",
              className
            )}
          >
            <Shield className="h-3 w-3" />
            Verified
          </Badge>
        );

      default:
        return (
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1.5 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
              clickable && "cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors",
              className
            )}
          >
            <div className="relative">
              <Shield className="h-4 w-4" />
              <CheckCircle2 className="h-2.5 w-2.5 absolute -top-1 -right-1" />
            </div>
            Blockchain Verified
          </Badge>
        );
    }
  };

  if (!clickable) {
    return <BadgeContent />;
  }

  return (
    <Link href={blockchainUrl}>
      <BadgeContent />
    </Link>
  );
}
