import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, CheckCircle2, Sparkles } from "lucide-react";

interface MatchCriteria {
  category: string;
  score: number;
  reason: string;
  icon?: React.ReactNode;
}

interface RecommendationExplanationProps {
  matchScore: number;
  reason: string;
  criteria?: MatchCriteria[];
  compact?: boolean;
}

export function RecommendationExplanation({
  matchScore,
  reason,
  criteria,
  compact = false,
}: RecommendationExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-gray-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 90) return "default";
    if (score >= 75) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">{reason}</span>
        <Badge variant={getScoreBadgeVariant(matchScore)} className="ml-auto">
          {matchScore}% Match
        </Badge>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Why this property?</h4>
              </div>
              <p className="text-sm text-muted-foreground">{reason}</p>
            </div>
            <Badge variant={getScoreBadgeVariant(matchScore)} className="text-lg px-3 py-1">
              {matchScore}%
            </Badge>
          </div>

          {/* Criteria Breakdown */}
          {criteria && criteria.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full justify-between hover:bg-primary/10"
              >
                <span className="text-sm font-medium">View match breakdown</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {isExpanded && (
                <div className="space-y-2 pt-2 border-t">
                  {criteria.map((criterion, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {criterion.icon || <CheckCircle2 className="h-4 w-4 text-primary" />}
                          <span className="text-sm font-medium">{criterion.category}</span>
                        </div>
                        <span className={`text-sm font-semibold ${getScoreColor(criterion.score)}`}>
                          {criterion.score}%
                        </span>
                      </div>
                      <div className="ml-6">
                        <div className="w-full bg-muted rounded-full h-2 mb-1">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${criterion.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{criterion.reason}</p>
                      </div>
                    </div>
                  ))}

                  {/* Overall Score */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Overall Match</span>
                      <span className={`text-lg font-bold ${getScoreColor(matchScore)}`}>
                        {matchScore}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 mt-2">
                      <div
                        className="bg-gradient-to-r from-primary to-primary/70 h-3 rounded-full transition-all"
                        style={{ width: `${matchScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline explanation for property cards
 */
export function InlineExplanation({ matchScore, reason }: { matchScore: number; reason: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
      <Badge variant="secondary" className="flex-shrink-0">
        {matchScore}%
      </Badge>
    </div>
  );
}
