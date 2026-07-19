import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

interface SmartFilterSuggestionsProps {
  onApplyFilters: (filters: {
    minBedrooms?: number;
    minBathrooms?: number;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    city?: string;
  }) => void;
  currentFilters: {
    minBedrooms?: number;
    minBathrooms?: number;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    city?: string;
  };
}

export function SmartFilterSuggestions({ onApplyFilters, currentFilters }: SmartFilterSuggestionsProps) {
  const [dismissed, setDismissed] = useState(false);

  const { data: preferences, isLoading } = trpc.feedbackAnalytics.getPropertyPreferences.useQuery();

  if (isLoading || dismissed || !preferences || preferences.totalLikedProperties === 0) {
    return null;
  }

  // Generate smart filter suggestions based on user preferences
  const suggestions: Array<{ label: string; value: any; key: string }> = [];

  // Bedroom suggestion
  if (preferences.averageBedrooms > 0 && currentFilters.minBedrooms !== preferences.averageBedrooms) {
    suggestions.push({
      label: `${preferences.averageBedrooms}+ bedrooms`,
      value: { minBedrooms: preferences.averageBedrooms },
      key: "bedrooms",
    });
  }

  // Bathroom suggestion
  if (preferences.averageBathrooms > 0 && currentFilters.minBathrooms !== preferences.averageBathrooms) {
    suggestions.push({
      label: `${preferences.averageBathrooms}+ bathrooms`,
      value: { minBathrooms: preferences.averageBathrooms },
      key: "bathrooms",
    });
  }

  // Price range suggestion (±20% of average)
  if (preferences.averagePrice > 0) {
    const minPrice = Math.round(preferences.averagePrice * 0.8);
    const maxPrice = Math.round(preferences.averagePrice * 1.2);
    if (currentFilters.minPrice !== minPrice || currentFilters.maxPrice !== maxPrice) {
      suggestions.push({
        label: `$${(minPrice / 1000).toFixed(0)}K - $${(maxPrice / 1000).toFixed(0)}K`,
        value: { minPrice, maxPrice },
        key: "price",
      });
    }
  }

  // Property type suggestion
  if (preferences.preferredPropertyTypes.length > 0) {
    const topType = preferences.preferredPropertyTypes[0].type;
    if (currentFilters.propertyType !== topType) {
      suggestions.push({
        label: topType.replace("_", " "),
        value: { propertyType: topType },
        key: "propertyType",
      });
    }
  }

  // City suggestion
  if (preferences.preferredCities.length > 0) {
    const topCity = preferences.preferredCities[0].city;
    if (currentFilters.city !== topCity) {
      suggestions.push({
        label: topCity,
        value: { city: topCity },
        key: "city",
      });
    }
  }

  if (suggestions.length === 0) {
    return null;
  }

  const handleApplyAll = () => {
    const combinedFilters = suggestions.reduce((acc, suggestion) => {
      return { ...acc, ...suggestion.value };
    }, {});
    onApplyFilters(combinedFilters);
  };

  const handleApplySingle = (filters: any) => {
    onApplyFilters(filters);
  };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Smart Filter Suggestions</CardTitle>
              <CardDescription className="text-sm">
                Based on your {preferences.totalLikedProperties} liked properties
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.key}
              variant="outline"
              size="sm"
              className="h-8 text-sm"
              onClick={() => handleApplySingle(suggestion.value)}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
        <Button
          onClick={handleApplyAll}
          size="sm"
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Apply All Suggestions
        </Button>
      </CardContent>
    </Card>
  );
}
