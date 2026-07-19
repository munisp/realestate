// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ExchangeRateHistoryChart } from "@/components/ExchangeRateHistoryChart";
import { CurrencyComparisonWidget } from "@/components/CurrencyComparisonWidget";
import { DollarSign, TrendingUp, Bell, ArrowLeftRight, Info } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH', flag: '🇲🇦' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', flag: '🇪🇹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
];

export default function CurrencySettings() {
  const { isAuthenticated } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [rateThreshold, setRateThreshold] = useState('5');

  const registerAlertMutation = trpc.exchangeRateAlerts.register.useMutation();
  const unregisterAlertMutation = trpc.exchangeRateAlerts.unregister.useMutation();
  const { data: myAlerts } = trpc.exchangeRateAlerts.getMyAlerts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Check if current currency has active alert
  const hasActiveAlert = myAlerts?.alerts.some(a => a.currency === currency);

  const { data: ratesData } = trpc.currency.getRates.useQuery({ base: currency });
  const { data: conversionData } = trpc.currency.convert.useQuery({
    amount: 100000,
    from: 'USD',
    to: currency,
  });

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    toast.success(`Currency changed to ${newCurrency}`);
  };

  const handleSaveNotificationSettings = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to enable notifications");
      return;
    }

    try {
      if (enableNotifications) {
        // Register alert
        const currentRate = conversionData?.rate || 1;
        await registerAlertMutation.mutateAsync({
          currency,
          threshold: parseFloat(rateThreshold),
          currentRate,
        });
        toast.success(`Rate alerts enabled for ${currency}`);
      } else {
        // Unregister alert
        await unregisterAlertMutation.mutateAsync({ currency });
        toast.success(`Rate alerts disabled for ${currency}`);
      }
    } catch (error) {
      toast.error("Failed to save notification preferences");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <DollarSign className="h-8 w-8 text-primary" />
            <span>{APP_TITLE} - Currency Settings</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            {!isAuthenticated && (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-3xl font-bold">Currency Preferences</h1>
            <p className="text-muted-foreground mt-2">
              Manage your currency display preferences and exchange rate notifications
            </p>
          </div>

          {/* Current Currency Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Preferred Currency
              </CardTitle>
              <CardDescription>
                All prices will be displayed in your selected currency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currency">Select Currency</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        <span className="flex items-center gap-2">
                          <span>{curr.flag}</span>
                          <span>{curr.name} ({curr.symbol})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Current Selection</p>
                    <p className="text-2xl font-bold mt-1">
                      {CURRENCIES.find(c => c.code === currency)?.flag} {currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Example Property</p>
                    <p className="text-xl font-semibold mt-1">
                      {conversionData?.formatted || 'Loading...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (USD $100,000)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exchange Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Exchange Rates
              </CardTitle>
              <CardDescription>
                Live exchange rates for {currency} (updated hourly)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ratesData ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(ratesData.rates).slice(0, 10).map(([code, rate]) => {
                    const currInfo = CURRENCIES.find(c => c.code === code);
                    return (
                      <div key={code} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{currInfo?.flag || '🌍'}</span>
                          <div>
                            <p className="font-medium">{code}</p>
                            <p className="text-xs text-muted-foreground">{currInfo?.name || code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{typeof rate === 'number' ? rate.toFixed(4) : rate}</p>
                          <p className="text-xs text-muted-foreground">per {currency}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Loading exchange rates...</p>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Rate Change Notifications
              </CardTitle>
              <CardDescription>
                Get notified when exchange rates change significantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-notifications">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for significant rate changes
                    {hasActiveAlert && <span className="text-green-600 font-medium"> (Active)</span>}
                  </p>
                </div>
                <Switch
                  id="enable-notifications"
                  checked={enableNotifications || hasActiveAlert}
                  onCheckedChange={setEnableNotifications}
                  disabled={!isAuthenticated}
                />
              </div>

              {enableNotifications && (
                <>
                  <Separator />
                  <div>
                    <Label htmlFor="threshold">Alert Threshold</Label>
                    <Select value={rateThreshold} onValueChange={setRateThreshold}>
                      <SelectTrigger id="threshold" className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1% change</SelectItem>
                        <SelectItem value="2">2% change</SelectItem>
                        <SelectItem value="5">5% change</SelectItem>
                        <SelectItem value="10">10% change</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll be notified when rates change by more than {rateThreshold}%
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        How it works
                      </p>
                      <p className="text-blue-700 dark:text-blue-300 mt-1">
                        We'll monitor exchange rates for your selected currency and send you an email
                        when rates change by your specified threshold. This helps you make informed
                        decisions about property purchases in different currencies.
                      </p>
                    </div>
                  </div>

                  <Button onClick={handleSaveNotificationSettings} className="w-full">
                    Save Notification Preferences
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Exchange Rate History Chart */}
          <ExchangeRateHistoryChart currency={currency} />

          {/* Currency Comparison Widget */}
          <CurrencyComparisonWidget />

          {/* Conversion Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Quick Converter
              </CardTitle>
              <CardDescription>
                Convert between USD and your preferred currency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <div className="text-2xl font-bold">$100,000</div>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Amount ({currency})</Label>
                  <div className="text-2xl font-bold">
                    {conversionData?.formatted || 'Loading...'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Rate: 1 USD = {conversionData?.rate?.toFixed(4) || '...'} {currency}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
