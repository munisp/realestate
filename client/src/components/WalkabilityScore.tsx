import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, Coffee, ShoppingCart, GraduationCap, 
  Bus, Heart, Utensils, Dumbbell, Info
} from "lucide-react";

interface WalkabilityScoreProps {
  propertyId: number;
  latitude: number;
  longitude: number;
}

export default function WalkabilityScore({ propertyId, latitude, longitude }: WalkabilityScoreProps) {
  // Mock data - in production, this would come from Walk Score API or similar
  const walkScore = 85;
  const transitScore = 78;
  const bikeScore = 72;

  const getScoreLabel = (score: number) => {
    if (score >= 90) return { label: "Walker's Paradise", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" };
    if (score >= 70) return { label: "Very Walkable", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" };
    if (score >= 50) return { label: "Somewhat Walkable", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" };
    if (score >= 25) return { label: "Car-Dependent", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" };
    return { label: "Very Car-Dependent", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" };
  };

  const walkScoreInfo = getScoreLabel(walkScore);
  const transitScoreInfo = getScoreLabel(transitScore);
  const bikeScoreInfo = getScoreLabel(bikeScore);

  const amenities = [
    {
      category: "Grocery Stores",
      icon: ShoppingCart,
      count: 8,
      nearest: "Whole Foods Market",
      distance: "0.3 miles",
      walkTime: "6 min walk",
      color: "text-green-600",
    },
    {
      category: "Restaurants & Cafes",
      icon: Coffee,
      count: 24,
      nearest: "Blue Bottle Coffee",
      distance: "0.2 miles",
      walkTime: "4 min walk",
      color: "text-orange-600",
    },
    {
      category: "Schools",
      icon: GraduationCap,
      count: 5,
      nearest: "Lincoln Elementary",
      distance: "0.5 miles",
      walkTime: "10 min walk",
      color: "text-blue-600",
    },
    {
      category: "Parks & Recreation",
      icon: Heart,
      count: 6,
      nearest: "Golden Gate Park",
      distance: "0.4 miles",
      walkTime: "8 min walk",
      color: "text-purple-600",
    },
    {
      category: "Public Transit",
      icon: Bus,
      count: 12,
      nearest: "BART Station",
      distance: "0.6 miles",
      walkTime: "12 min walk",
      color: "text-indigo-600",
    },
    {
      category: "Fitness Centers",
      icon: Dumbbell,
      count: 4,
      nearest: "24 Hour Fitness",
      distance: "0.7 miles",
      walkTime: "14 min walk",
      color: "text-red-600",
    },
  ];

  const dailyErrands = [
    { name: "Groceries", score: 95, description: "Multiple options within walking distance" },
    { name: "Shopping", score: 88, description: "Good variety of stores nearby" },
    { name: "Dining", score: 92, description: "Excellent restaurant selection" },
    { name: "Entertainment", score: 85, description: "Many entertainment venues" },
    { name: "Banking", score: 90, description: "Several banks and ATMs" },
  ];

  return (
    <div className="space-y-6">
      {/* Main Scores */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={walkScoreInfo.bg}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full border-8 border-primary flex items-center justify-center">
                <span className="text-3xl font-bold">{walkScore}</span>
              </div>
              <h3 className="font-semibold mb-1">Walk Score®</h3>
              <Badge variant="secondary" className={walkScoreInfo.color}>
                {walkScoreInfo.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Daily errands do not require a car
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={transitScoreInfo.bg}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full border-8 border-blue-600 flex items-center justify-center">
                <span className="text-3xl font-bold">{transitScore}</span>
              </div>
              <h3 className="font-semibold mb-1">Transit Score®</h3>
              <Badge variant="secondary" className={transitScoreInfo.color}>
                {transitScoreInfo.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Excellent public transportation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={bikeScoreInfo.bg}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full border-8 border-green-600 flex items-center justify-center">
                <span className="text-3xl font-bold">{bikeScore}</span>
              </div>
              <h3 className="font-semibold mb-1">Bike Score®</h3>
              <Badge variant="secondary" className={bikeScoreInfo.color}>
                {bikeScoreInfo.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Biking is convenient for most trips
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nearby Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>Nearby Amenities</CardTitle>
          <CardDescription>Essential services and attractions within walking distance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {amenities.map((amenity, index) => {
              const Icon = amenity.icon;
              return (
                <div key={index} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${amenity.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">{amenity.category}</h4>
                      <Badge variant="secondary">{amenity.count} nearby</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Nearest:</span> {amenity.nearest}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {amenity.distance}
                      </span>
                      <span>•</span>
                      <span>{amenity.walkTime}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Errands */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Errands</CardTitle>
          <CardDescription>How easy it is to accomplish daily tasks without a car</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyErrands.map((errand, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{errand.name}</span>
                  <span className="text-sm font-semibold">{errand.score}/100</span>
                </div>
                <Progress value={errand.score} className="h-2 mb-1" />
                <p className="text-xs text-muted-foreground">{errand.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card>
        <CardHeader>
          <CardTitle>Walkability Map</CardTitle>
          <CardDescription>Explore nearby amenities and walking routes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Interactive map showing walking routes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Walk Score */}
      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-semibold mb-2">About Walk Score®</h4>
              <p className="text-muted-foreground mb-2">
                Walk Score measures the walkability of any address based on the distance to nearby amenities. 
                Points are awarded based on the distance to amenities in each category. Amenities within a 5 
                minute walk (.25 miles) are given maximum points. A decay function is used to give points to 
                more distant amenities, with no points given after a 30 minute walk.
              </p>
              <p className="text-muted-foreground">
                Walk Score also measures pedestrian friendliness by analyzing population density and road 
                metrics such as block length and intersection density.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
