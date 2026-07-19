import { createContext, useContext, useState, ReactNode } from "react";

interface Property {
  id: number;
  title: string;
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  primaryImage?: string | null;
  city: string;
  state: string;
  propertyType: string;
  features?: string | null;
}

interface ComparisonContextType {
  comparisonList: Property[];
  addToComparison: (property: Property) => void;
  removeFromComparison: (propertyId: number) => void;
  clearComparison: () => void;
  isInComparison: (propertyId: number) => boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [comparisonList, setComparisonList] = useState<Property[]>([]);

  const addToComparison = (property: Property) => {
    if (comparisonList.length >= 3) {
      return; // Max 3 properties
    }
    if (!comparisonList.find(p => p.id === property.id)) {
      setComparisonList([...comparisonList, property]);
    }
  };

  const removeFromComparison = (propertyId: number) => {
    setComparisonList(comparisonList.filter(p => p.id !== propertyId));
  };

  const clearComparison = () => {
    setComparisonList([]);
  };

  const isInComparison = (propertyId: number) => {
    return comparisonList.some(p => p.id === propertyId);
  };

  return (
    <ComparisonContext.Provider
      value={{
        comparisonList,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error("useComparison must be used within a ComparisonProvider");
  }
  return context;
}
