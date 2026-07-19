import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Hook for tracking valuation page analytics
 */
export function useValuationAnalytics(propertyId: number) {
  const { user } = useAuth();
  const [viewId, setViewId] = useState<number | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const startTimeRef = useRef<number>(Date.now());
  const tabTimesRef = useRef<Record<string, number>>({});
  const currentTabRef = useRef<string | null>(null);

  const trackViewMutation = trpc.analytics.trackValuationView.useMutation();
  const trackTabMutation = trpc.analytics.trackTabEngagement.useMutation();
  const trackConversionMutation = trpc.analytics.trackConversion.useMutation();

  // Initialize view tracking
  useEffect(() => {
    const initView = async () => {
      try {
        const result = await trackViewMutation.mutateAsync({
          propertyId,
          userId: user?.id,
          sessionId,
          deviceType: getDeviceType(),
          browser: getBrowserName(),
          referrerPage: document.referrer || undefined,
        });
        
        if (result?.viewId) {
          setViewId(result.viewId);
        }
      } catch (error) {
        console.error("Failed to track view:", error);
      }
    };

    initView();

    // Track page unload
    const handleBeforeUnload = () => {
      if (viewId) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const scrollDepth = getScrollDepth();
        
        // Use sendBeacon for reliable tracking on page unload
        navigator.sendBeacon(
          "/api/trpc/analytics.updateValuationView",
          JSON.stringify({
            viewId,
            viewDurationSeconds: duration,
            scrollDepth,
            tabsViewed: JSON.stringify(Object.keys(tabTimesRef.current)),
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [propertyId, user?.id]);

  // Track tab changes
  const trackTabView = (tabName: string) => {
    if (!viewId) return;

    // Save time for previous tab
    if (currentTabRef.current) {
      const prevTab = currentTabRef.current;
      const timeSpent = tabTimesRef.current[prevTab] || 0;
      tabTimesRef.current[prevTab] = timeSpent + (Date.now() - startTimeRef.current);

      // Send tab engagement
      trackTabMutation.mutate({
        viewId,
        propertyId,
        userId: user?.id,
        tabName: prevTab,
        timeSpentSeconds: Math.floor(timeSpent / 1000),
        interactionCount: 0, // TODO: Track interactions
      });
    }

    // Start tracking new tab
    currentTabRef.current = tabName;
    startTimeRef.current = Date.now();
  };

  // Track conversions
  const trackConversion = (conversionType: "contact_agent" | "schedule_tour" | "add_favorite") => {
    if (!viewId) return;

    const timeToConversion = Math.floor((Date.now() - startTimeRef.current) / 1000);

    trackConversionMutation.mutate({
      viewId,
      propertyId,
      userId: user?.id,
      conversionType,
      timeToConversionSeconds: timeToConversion,
    });
  };

  return {
    viewId,
    trackTabView,
    trackConversion,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  let browserName = "Unknown";

  if (ua.indexOf("Firefox") > -1) {
    browserName = "Firefox";
  } else if (ua.indexOf("SamsungBrowser") > -1) {
    browserName = "Samsung Browser";
  } else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) {
    browserName = "Opera";
  } else if (ua.indexOf("Trident") > -1) {
    browserName = "Internet Explorer";
  } else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) {
    browserName = "Edge";
  } else if (ua.indexOf("Chrome") > -1) {
    browserName = "Chrome";
  } else if (ua.indexOf("Safari") > -1) {
    browserName = "Safari";
  }

  return browserName;
}

function getScrollDepth(): number {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrolled = (scrollTop + windowHeight) / documentHeight;
  return Math.min(Math.round(scrolled * 100), 100);
}
