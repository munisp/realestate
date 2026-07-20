// @ts-nocheck
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Award, Briefcase, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

export default function BuilderMarketplace() {
  const { isAuthenticated } = useAuth();
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('');
  
  const { data, isLoading } = trpc.builderServices.getBuilders.useQuery({
    city: city || undefined,
    specialty: specialty || undefined,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-4">Find Trusted Builders</h1>
          <p className="text-lg opacity-90">Connect with certified construction professionals for your next project</p>
        </div>
      </div>

      {/* Search Filters */}
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Search Builders</CardTitle>
            <CardDescription>Filter by location and specialty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">City</label>
                <Input
                  placeholder="Lagos, Abuja, Port Harcourt..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Specialty</label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger>
                    <SelectValue placeholder="All specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All specialties</SelectItem>
                    <SelectItem value="residential">Residential Construction</SelectItem>
                    <SelectItem value="commercial">Commercial Construction</SelectItem>
                    <SelectItem value="renovation">Renovations</SelectItem>
                    <SelectItem value="interior">Interior Design</SelectItem>
                    <SelectItem value="landscaping">Landscaping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button className="w-full">Search</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {data?.total || 0} Builders Found
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.builders.map((builder) => (
                <Card key={builder.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{builder.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {builder.city}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{builder.rating}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      {builder.yearsExperience} years experience
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Award className="h-4 w-4" />
                      {builder.completedProjects} completed projects
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {builder.certifications?.slice(0, 2).map((cert, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {cert}
                        </Badge>
                      ))}
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {builder.services?.slice(0, 3).map((service, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Link href={`/builders/${builder.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">View Profile</Button>
                    </Link>
                    <RequestQuoteDialog builderId={builder.id} builderName={builder.name} />
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestQuoteDialog({ builderId, builderName }: { builderId: number; builderName: string }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [projectType, setProjectType] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [location, setLocation] = useState('');

  const requestQuote = trpc.builderServices.requestQuote.useMutation({
    onSuccess: () => {
      toast.success('Quote request sent successfully!');
      setOpen(false);
      // Reset form
      setProjectType('');
      setDescription('');
      setBudget('');
      setTimeline('');
      setLocation('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send quote request');
    },
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!projectType || !description || !location) {
      toast.error('Please fill in all required fields');
      return;
    }

    requestQuote.mutate({
      builderId,
      projectType: projectType as any,
      description,
      budget: budget ? parseInt(budget) : undefined,
      timeline,
      location,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1">Request Quote</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Quote from {builderName}</DialogTitle>
          <DialogDescription>
            Provide details about your project to get an accurate quote
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project Type *</label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_construction">New Construction</SelectItem>
                <SelectItem value="renovation">Renovation</SelectItem>
                <SelectItem value="extension">Extension</SelectItem>
                <SelectItem value="interior_design">Interior Design</SelectItem>
                <SelectItem value="landscaping">Landscaping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Project Description *</label>
            <Textarea
              placeholder="Describe your project in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Budget (₦)</label>
              <Input
                type="number"
                placeholder="50,000,000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Timeline</label>
              <Input
                placeholder="6 months"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Project Location *</label>
            <Input
              placeholder="Lekki, Lagos"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={requestQuote.isPending}>
            {requestQuote.isPending ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
