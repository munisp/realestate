import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PricingCalendarProps {
  propertyId: number;
  basePrice: number;
}

export default function PricingCalendar({ propertyId, basePrice }: PricingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getPriceForDate = (date: Date): { price: number; status: "available" | "booked" | "blocked"; trend: "up" | "down" | "same" } => {
    // Mock pricing logic - replace with actual API call
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
    
    // Simulate demand-based pricing
    const demandMultiplier = 0.8 + Math.random() * 0.7; // 0.8 to 1.5
    const weekendMultiplier = isWeekend ? 1.2 : 1.0;
    const price = Math.round(basePrice * weekendMultiplier * demandMultiplier);
    
    // Simulate bookings (random for demo)
    const isBooked = Math.random() < 0.15;
    const isBlocked = Math.random() < 0.05;
    
    let status: "available" | "booked" | "blocked" = "available";
    if (isBooked) status = "booked";
    if (isBlocked) status = "blocked";
    
    // Determine trend
    let trend: "up" | "down" | "same" = "same";
    if (price > basePrice * 1.1) trend = "up";
    if (price < basePrice * 0.9) trend = "down";
    
    return { price, status, trend };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate statistics
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    return getPriceForDate(date);
  });

  const availableDays = allDays.filter(d => d.status === "available");
  const avgPrice = availableDays.length > 0 
    ? Math.round(availableDays.reduce((sum, d) => sum + d.price, 0) / availableDays.length)
    : basePrice;
  const minPrice = availableDays.length > 0 ? Math.min(...availableDays.map(d => d.price)) : basePrice;
  const maxPrice = availableDays.length > 0 ? Math.max(...availableDays.map(d => d.price)) : basePrice;
  const bookedCount = allDays.filter(d => d.status === "booked").length;
  const occupancyRate = ((bookedCount / daysInMonth) * 100).toFixed(0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pricing Calendar</CardTitle>
            <CardDescription>View and manage daily pricing</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {monthName}
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Avg Price</div>
            <div className="text-2xl font-bold">₦{avgPrice.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Min Price</div>
            <div className="text-2xl font-bold">₦{minPrice.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Max Price</div>
            <div className="text-2xl font-bold">₦{maxPrice.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Occupancy</div>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Week day headers */}
          <div className="grid grid-cols-7 bg-muted">
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-semibold border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square border-r border-b bg-muted/30" />
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const date = new Date(year, month, dayNumber);
              const { price, status, trend } = getPriceForDate(date);
              const isToday = 
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={dayNumber}
                  className={`aspect-square border-r border-b p-2 hover:bg-muted/50 transition-colors cursor-pointer ${
                    isToday ? "bg-blue-50 dark:bg-blue-950" : ""
                  } ${
                    status === "booked" ? "bg-red-50 dark:bg-red-950" : ""
                  } ${
                    status === "blocked" ? "bg-gray-100 dark:bg-gray-900" : ""
                  }`}
                >
                  <div className="flex flex-col h-full">
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isToday ? "text-blue-600 dark:text-blue-400" : ""}`}>
                        {dayNumber}
                      </span>
                      {trend === "up" && status === "available" && (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      )}
                      {trend === "down" && status === "available" && (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      {trend === "same" && status === "available" && (
                        <Minus className="h-3 w-3 text-gray-400" />
                      )}
                    </div>

                    {/* Price or status */}
                    <div className="flex-1 flex items-center justify-center">
                      {status === "available" ? (
                        <div className="text-center">
                          <div className="text-xs font-semibold">
                            ₦{(price / 1000).toFixed(0)}k
                          </div>
                        </div>
                      ) : status === "booked" ? (
                        <Badge variant="destructive" className="text-xs py-0 px-1">
                          Booked
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs py-0 px-1">
                          Blocked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white dark:bg-gray-800 border rounded" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 dark:bg-red-950 border rounded" />
            <span className="text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 dark:bg-gray-900 border rounded" />
            <span className="text-muted-foreground">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">High demand</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-muted-foreground">Low demand</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
