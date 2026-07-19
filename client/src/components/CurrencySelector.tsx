// @ts-nocheck
import { useEffect } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { DollarSign } from 'lucide-react';

interface CurrencySelectorProps {
  value?: string;
  onChange?: (currency: string) => void;
  className?: string;
}

export function CurrencySelector({ value, onChange, className }: CurrencySelectorProps) {
  const { data: currenciesData } = trpc.currency.getSupportedCurrencies.useQuery();
  const { currency: globalCurrency, setCurrency: setGlobalCurrency } = useCurrency();
  
  const selectedCurrency = value || globalCurrency;

  const handleChange = (newCurrency: string) => {
    setGlobalCurrency(newCurrency);
    onChange?.(newCurrency);
  };

  return (
    <Select value={selectedCurrency} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {currenciesData?.currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <div className="flex items-center justify-between w-full gap-4">
              <span className="font-medium">{currency.code}</span>
              <span className="text-muted-foreground text-sm">{currency.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  showOriginal?: boolean;
  originalCurrency?: string;
  className?: string;
}

export function PriceDisplay({
  amount,
  currency: propCurrency,
  showOriginal = false,
  originalCurrency = 'USD',
  className = '',
}: PriceDisplayProps) {
  const { currency: globalCurrency } = useCurrency();
  const currency = propCurrency || globalCurrency;
  
  const { data: convertedData } = trpc.currency.convert.useQuery(
    {
      amount,
      from: originalCurrency,
      to: currency,
    },
    {
      enabled: currency !== originalCurrency,
    }
  );

  const { data: formatData } = trpc.currency.format.useQuery({
    amount: convertedData?.converted || amount,
    currency,
  });

  if (currency === originalCurrency) {
    return (
      <span className={className}>
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: originalCurrency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount)}
      </span>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <span className="font-semibold">
        {formatData?.formatted || 'Loading...'}
      </span>
      {showOriginal && convertedData && (
        <span className="text-xs text-muted-foreground">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: originalCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount)}{' '}
          @ {convertedData.rate.toFixed(4)}
        </span>
      )}
    </div>
  );
}


