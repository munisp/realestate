import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useComparison } from "@/contexts/ComparisonContext";
import { X, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export function ComparisonToolbar() {
  const { comparisonList, removeFromComparison, clearComparison } = useComparison();

  if (comparisonList.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2">
        <div className="flex items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Compare Properties:</span>
            <span className="text-sm text-muted-foreground">
              {comparisonList.length} / 3 selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {comparisonList.map((property) => (
              <div
                key={property.id}
                className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md"
              >
                <span className="text-sm max-w-[150px] truncate">
                  {property.title}
                </span>
                <button
                  onClick={() => removeFromComparison(property.id)}
                  className="hover:bg-background rounded-sm p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearComparison}>
              Clear All
            </Button>
            <Button asChild size="sm">
              <Link href="/compare">
                Compare
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
