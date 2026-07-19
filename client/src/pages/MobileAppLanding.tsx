import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { APP_TITLE } from '@/const';
import { 
  Smartphone, 
  MapPin, 
  Bell, 
  Search, 
  Heart, 
  Calendar,
  Shield,
  Zap,
  Download,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';

/**
 * Mobile App Landing Page
 * 
 * Promotes the upcoming mobile app with feature highlights,
 * app store badges, and email signup for launch notifications
 */

export default function MobileAppLanding() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    // Simulate API call - in production, save to database
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubscribed(true);
    setLoading(false);
    toast.success('Thanks for subscribing! We\'ll notify you when the app launches.');
  };

  const features = [
    {
      icon: Search,
      title: 'Smart Property Search',
      description: 'Find your dream home with AI-powered search and personalized recommendations on the go'
    },
    {
      icon: MapPin,
      title: 'Location-Based Discovery',
      description: 'Discover properties near you with interactive maps and neighborhood insights'
    },
    {
      icon: Bell,
      title: 'Instant Notifications',
      description: 'Get real-time alerts for new listings, price drops, and open houses'
    },
    {
      icon: Calendar,
      title: 'Easy Tour Scheduling',
      description: 'Book property viewings and virtual tours directly from your phone'
    },
    {
      icon: Heart,
      title: 'Save & Compare',
      description: 'Create collections of favorite properties and compare them side-by-side'
    },
    {
      icon: Shield,
      title: 'Secure Transactions',
      description: 'Complete the entire buying process securely from your mobile device'
    }
  ];

  const screenshots = [
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=800&fit=crop',
    'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=800&fit=crop',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=800&fit=crop',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Smartphone className="h-6 w-6 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
                <Zap className="h-4 w-4" />
                Coming Soon
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Your Dream Home,
                <span className="text-primary"> In Your Pocket</span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Search, discover, and buy properties with the most powerful real estate app in Nigeria. 
                Get early access and be the first to experience the future of property hunting.
              </p>

              {!subscribed ? (
                <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" size="lg" disabled={loading} className="h-12 px-8">
                    {loading ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Mail className="mr-2 h-5 w-5" />
                        Notify Me
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg max-w-md">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">You're on the list!</p>
                    <p className="text-sm text-green-600 dark:text-green-500">We'll email you when the app launches.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button variant="outline" size="lg" disabled className="gap-2">
                  <Download className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </Button>
                <Button variant="outline" size="lg" disabled className="gap-2">
                  <Download className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-xs">Get it on</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-3 gap-4">
                {screenshots.map((screenshot, index) => (
                  <div
                    key={index}
                    className={`relative rounded-3xl overflow-hidden shadow-2xl transform transition-transform hover:scale-105 ${
                      index === 1 ? 'scale-110 z-10' : 'opacity-80'
                    }`}
                  >
                    <img
                      src={screenshot}
                      alt={`App Screenshot ${index + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need, Anywhere</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make property hunting effortless and enjoyable
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Properties Listed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">5K+</div>
              <div className="text-muted-foreground">Happy Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Cities Covered</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">4.8★</div>
              <div className="text-muted-foreground">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Be Among the First to Experience It</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of early adopters waiting for launch. Get exclusive access and special launch offers.
          </p>
          
          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white text-foreground"
                disabled={loading}
              />
              <Button type="submit" size="lg" variant="secondary" disabled={loading} className="h-12 px-8">
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                ) : (
                  'Get Notified'
                )}
              </Button>
            </form>
          ) : (
            <div className="inline-flex items-center gap-3 p-4 bg-white/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-medium">Thank you! We'll be in touch soon.</span>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 {APP_TITLE}. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/properties" className="hover:text-foreground transition-colors">
              Browse Properties
            </Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
