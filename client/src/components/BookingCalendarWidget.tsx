import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingCalendarWidgetProps {
  propertyId: number;
  pricePerNight: number;
  cleaningFee?: number;
  serviceFee?: number;
  minNights?: number;
  blockedDates?: Date[];
  onDateSelect?: (startDate: Date | null, endDate: Date | null, totalPrice: number) => void;
}

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isBlocked: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isToday: boolean;
}

export default function BookingCalendarWidget({
  propertyId,
  pricePerNight,
  cleaningFee = 50,
  serviceFee = 0.12, // 12% service fee
  minNights = 1,
  blockedDates = [],
  onDateSelect,
}: BookingCalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (date: Date): DayInfo[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: DayInfo[] = [];

    // Previous month's days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isBlocked: isDateBlocked(dayDate),
        isSelected: isDateSelected(dayDate),
        isInRange: isDateInRange(dayDate),
        isToday: false,
      });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isBlocked: isDateBlocked(dayDate),
        isSelected: isDateSelected(dayDate),
        isInRange: isDateInRange(dayDate),
        isToday: isToday(dayDate),
      });
    }

    // Next month's days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const dayDate = new Date(year, month + 1, day);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isBlocked: isDateBlocked(dayDate),
        isSelected: isDateSelected(dayDate),
        isInRange: isDateInRange(dayDate),
        isToday: false,
      });
    }

    return days;
  };

  const isDateBlocked = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    return blockedDates.some(
      (blocked) =>
        blocked.getFullYear() === date.getFullYear() &&
        blocked.getMonth() === date.getMonth() &&
        blocked.getDate() === date.getDate()
    );
  };

  const isDateSelected = (date: Date): boolean => {
    if (!startDate && !endDate) return false;
    if (startDate && isSameDay(date, startDate)) return true;
    if (endDate && isSameDay(date, endDate)) return true;
    return false;
  };

  const isDateInRange = (date: Date): boolean => {
    if (!startDate || !endDate) {
      if (startDate && hoveredDate && !isDragging) {
        const rangeStart = startDate < hoveredDate ? startDate : hoveredDate;
        const rangeEnd = startDate < hoveredDate ? hoveredDate : startDate;
        return date > rangeStart && date < rangeEnd;
      }
      return false;
    }
    return date > startDate && date < endDate;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const handleDateClick = (date: Date, isBlocked: boolean) => {
    if (isBlocked) return;

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(null);
    } else {
      // Complete selection
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleMouseDown = (date: Date, isBlocked: boolean) => {
    if (isBlocked) return;
    setIsDragging(true);
    setStartDate(date);
    setEndDate(null);
  };

  const handleMouseEnter = (date: Date, isBlocked: boolean) => {
    if (isBlocked) return;
    setHoveredDate(date);
    if (isDragging && startDate) {
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const calculateTotalPrice = (): { nights: number; subtotal: number; cleaning: number; service: number; total: number } | null => {
    if (!startDate || !endDate) return null;

    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < minNights) return null;

    const subtotal = nights * pricePerNight;
    const service = subtotal * serviceFee;
    const total = subtotal + cleaningFee + service;

    return { nights, subtotal, cleaning: cleaningFee, service, total };
  };

  const priceBreakdown = calculateTotalPrice();

  useEffect(() => {
    if (startDate && endDate && priceBreakdown && onDateSelect) {
      onDateSelect(startDate, endDate, priceBreakdown.total);
    }
  }, [startDate, endDate, priceBreakdown?.total]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Dates
          </span>
          {startDate && (
            <Button variant="ghost" size="sm" onClick={clearDates}>
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              type="button"
              disabled={day.isBlocked}
              onMouseDown={() => handleMouseDown(day.date, day.isBlocked)}
              onMouseEnter={() => handleMouseEnter(day.date, day.isBlocked)}
              onClick={() => handleDateClick(day.date, day.isBlocked)}
              className={cn(
                "aspect-square p-2 text-sm rounded-md transition-colors relative",
                "hover:bg-accent hover:text-accent-foreground",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                !day.isCurrentMonth && "text-muted-foreground",
                day.isToday && "font-bold ring-2 ring-primary ring-inset",
                day.isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                day.isInRange && "bg-primary/20",
                day.isBlocked && "line-through"
              )}
            >
              {day.date.getDate()}
            </button>
          ))}
        </div>

        {/* Price Breakdown */}
        {priceBreakdown && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>
                ${pricePerNight} × {priceBreakdown.nights} {priceBreakdown.nights === 1 ? "night" : "nights"}
              </span>
              <span>${priceBreakdown.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cleaning fee</span>
              <span>${priceBreakdown.cleaning.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service fee ({(serviceFee * 100).toFixed(0)}%)</span>
              <span>${priceBreakdown.service.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>${priceBreakdown.total.toFixed(2)}</span>
            </div>
            {priceBreakdown.nights < minNights && (
              <p className="text-sm text-destructive">
                Minimum {minNights} {minNights === 1 ? "night" : "nights"} required
              </p>
            )}
          </div>
        )}

        {/* Instructions */}
        {!startDate && (
          <p className="text-sm text-muted-foreground text-center">
            Click or drag to select check-in and check-out dates
          </p>
        )}
        {startDate && !endDate && (
          <p className="text-sm text-muted-foreground text-center">
            Select check-out date
          </p>
        )}
      </CardContent>
    </Card>
  );
}
