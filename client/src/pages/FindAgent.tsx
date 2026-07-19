// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Star, MapPin, Phone, Mail, MessageCircle, 
  Calendar, Award, TrendingUp, Users, Filter, Search 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function FindAgent() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [consultationDate, setConsultationDate] = useState("");
  const [consultationTime, setConsultationTime] = useState("");

  const { data: agents, isLoading } = trpc.agents.search.useQuery({
    query: searchQuery,
    location: locationFilter !== "all" ? locationFilter : undefined,
    specialty: specialtyFilter !== "all" ? specialtyFilter : undefined,
    experience: experienceFilter !== "all" ? experienceFilter : undefined,
    language: languageFilter !== "all" ? languageFilter : undefined,
  });

  const sendMessageMutation = trpc.agents.sendMessage.useMutation({
    onSuccess: () => {
      setIsMessageDialogOpen(false);
      setMessage("");
      toast.success("Message sent successfully! The agent will respond soon.");
    },
  });

  const scheduleConsultationMutation = trpc.agents.scheduleConsultation.useMutation({
    onSuccess: () => {
      setIsScheduleDialogOpen(false);
      setConsultationDate("");
      setConsultationTime("");
      toast.success("Consultation scheduled! You'll receive a confirmation email.");
    },
  });

  const handleSendMessage = async () => {
    if (!message || !selectedAgent) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        agentId: selectedAgent.id,
        message,
      });
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleScheduleConsultation = async () => {
    if (!consultationDate || !consultationTime || !selectedAgent) {
      toast.error("Please select a date and time");
      return;
    }

    try {
      await scheduleConsultationMutation.mutateAsync({
        agentId: selectedAgent.id,
        date: consultationDate,
        time: consultationTime,
      });
    } catch (error) {
      toast.error("Failed to schedule consultation");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <span className="text-sm text-muted-foreground">{user?.name}</span>
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Your Perfect Agent</h1>
          <p className="text-muted-foreground">
            Connect with experienced real estate agents in your area
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Agent name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger id="location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="lagos">Lagos</SelectItem>
                    <SelectItem value="abuja">Abuja</SelectItem>
                    <SelectItem value="port-harcourt">Port Harcourt</SelectItem>
                    <SelectItem value="san-francisco">San Francisco</SelectItem>
                    <SelectItem value="new-york">New York</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="specialty">Specialty</Label>
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger id="specialty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    <SelectItem value="buyer">Buyer's Agent</SelectItem>
                    <SelectItem value="seller">Seller's Agent</SelectItem>
                    <SelectItem value="luxury">Luxury Properties</SelectItem>
                    <SelectItem value="investment">Investment Properties</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="experience">Experience</Label>
                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                  <SelectTrigger id="experience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Experience</SelectItem>
                    <SelectItem value="0-2">0-2 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="6-10">6-10 years</SelectItem>
                    <SelectItem value="10+">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="yoruba">Yoruba</SelectItem>
                    <SelectItem value="igbo">Igbo</SelectItem>
                    <SelectItem value="hausa">Hausa</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-32 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : agents?.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Agents Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to see more results
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents?.map((agent: any) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback>{agent.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{agent.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{agent.rating}</span>
                        <span className="text-sm text-muted-foreground">
                          ({agent.reviewCount} reviews)
                        </span>
                      </div>
                      <Badge variant="secondary">{agent.specialty}</Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {agent.bio}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{agent.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>{agent.yearsExperience} years experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span>{agent.salesLast12Months} sales in last 12 months</span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {agent.languages.map((lang: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Avg Price</p>
                      <p className="font-bold text-sm">
                        ${(agent.avgSalePrice / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Response</p>
                      <p className="font-bold text-sm">{agent.responseTime}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Clients</p>
                      <p className="font-bold text-sm">{agent.totalClients}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        setSelectedAgent(agent);
                        setIsMessageDialogOpen(true);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedAgent(agent);
                        setIsScheduleDialogOpen(true);
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 pt-4 border-t space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{agent.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span>{agent.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Message Dialog */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message to {selectedAgent?.name}</DialogTitle>
              <DialogDescription>
                The agent will respond to your message via email
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
                  placeholder="Hi, I'm interested in finding a property in..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="w-full"
              >
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Consultation with {selectedAgent?.name}</DialogTitle>
              <DialogDescription>
                Choose a date and time for your consultation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={consultationDate}
                  onChange={(e) => setConsultationDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Select value={consultationTime} onValueChange={setConsultationTime}>
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                    <SelectItem value="17:00">5:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleScheduleConsultation}
                disabled={scheduleConsultationMutation.isPending}
                className="w-full"
              >
                {scheduleConsultationMutation.isPending ? "Scheduling..." : "Schedule Consultation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
