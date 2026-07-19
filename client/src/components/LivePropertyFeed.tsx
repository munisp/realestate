import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, MapPin, Bed, Bath, Square, Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";

interface LiveProperty {
  id: number;
  title: string;
  address: string;
  city: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  imageUrl: string;
  isHotDeal: boolean;
  gnnScore: number;
  investmentPotential: number;
  timestamp: Date;
}

interface LivePropertyFeedProps {
  maxItems?: number;
  showFilters?: boolean;
  autoScroll?: boolean;
}

export function LivePropertyFeed({ 
  maxItems = 10, 
  showFilters = true,
  autoScroll = true 
}: LivePropertyFeedProps) {
  const [properties, setProperties] = useState<LiveProperty[]>([]);
  const [filter, setFilter] = useState<"all" | "hot-deals" | "high-potential">("all");
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/property-feed`;
    
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[LivePropertyFeed] WebSocket connected");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (isPaused) return;

        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "new-property") {
            const newProperty: LiveProperty = {
              ...data.property,
              timestamp: new Date(data.property.timestamp),
            };

            setProperties((prev) => {
              const updated = [newProperty, ...prev];
              return updated.slice(0, maxItems);
            });

            // Auto-scroll to top if enabled
            if (autoScroll) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }
        } catch (error) {
          console.error("[LivePropertyFeed] Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[LivePropertyFeed] WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("[LivePropertyFeed] WebSocket disconnected");
        setIsConnected(false);
        
        // Reconnect after 5 seconds
        reconnectTimeout = setTimeout(() => {
          console.log("[LivePropertyFeed] Reconnecting...");
          connect();
        }, 5000);
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [maxItems, autoScroll, isPaused]);

  const filteredProperties = properties.filter((property) => {
    if (filter === "hot-deals") return property.isHotDeal;
    if (filter === "high-potential") return property.investmentPotential >= 85;
    return true;
  });

  const formatPrice = (price: number, currency: string) => {
    if (currency === "NGN") {
      return `₦${(price / 1_000_000).toFixed(1)}M`;
    }
    return `$${(price / 1_000).toFixed(0)}K`;
  };

  const getTimeSince = (timestamp: Date) => {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-primary" />
            {isConnected && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <h3 className="text-lg font-semibold">Live Property Feed</h3>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Live" : "Connecting..."}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? "Resume" : "Pause"}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Properties
          </Button>
          <Button
            variant={filter === "hot-deals" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("hot-deals")}
          >
            🔥 Hot Deals
          </Button>
          <Button
            variant={filter === "high-potential" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("high-potential")}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            High Potential
          </Button>
        </div>
      )}

      {/* Property Feed */}
      <div className="space-y-3">
        {filteredProperties.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {isPaused
                ? "Feed paused. Click Resume to continue."
                : "Waiting for new properties..."}
            </CardContent>
          </Card>
        )}

        {filteredProperties.map((property) => (
          <Card
            key={`${property.id}-${property.timestamp.getTime()}`}
            className="overflow-hidden hover:shadow-lg transition-all cursor-pointer animate-in slide-in-from-top-2 duration-500"
            onClick={() => setLocation(`/property/${property.id}`)}
          >
            <CardContent className="p-0">
              <div className="flex gap-4">
                {/* Property Image */}
                <div className="relative w-48 h-32 flex-shrink-0">
                  <img
                    src={property.imageUrl}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  {property.isHotDeal && (
                    <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
                      🔥 Hot Deal
                    </Badge>
                  )}
                  <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                    {getTimeSince(property.timestamp)}
                  </Badge>
                </div>

                {/* Property Details */}
                <div className="flex-1 py-3 pr-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-base line-clamp-1">
                        {property.title}
                      </h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{property.address}, {property.city}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {formatPrice(property.price, property.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Property Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{property.bedrooms} beds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{property.bathrooms} baths</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      <span>{property.squareFeet.toLocaleString()} sqft</span>
                    </div>
                  </div>

                  {/* GNN Scores */}
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      GNN Score: {property.gnnScore.toFixed(1)}
                    </Badge>
                    {property.investmentPotential >= 85 && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Investment: {property.investmentPotential.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Stats */}
      {properties.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredProperties.length} of {properties.length} recent properties
        </div>
      )}
    </div>
  );
}
