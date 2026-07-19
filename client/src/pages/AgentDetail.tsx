import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Mail, Phone, Star } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [messageContent, setMessageContent] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: agent, isLoading } = trpc.agents.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id }
  );

  const sendMessageMutation = trpc.messages.send.useMutation();

  const handleSendMessage = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to send messages");
      return;
    }

    if (!messageContent.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!agent) return;

    try {
      await sendMessageMutation.mutateAsync({
        receiverId: agent.userId,
        subject: `Inquiry about your services`,
        content: messageContent,
      });
      
      toast.success("Message sent successfully!");
      setMessageContent("");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Agent Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/agents">Back to Agents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/agents" className="text-muted-foreground hover:text-foreground transition-colors">
              All Agents
            </Link>
            <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-6">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                  {agent.agency?.charAt(0) || 'A'}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-3xl mb-2">{agent.agency || 'Real Estate Agent'}</CardTitle>
                      <CardDescription className="text-base">
                        {agent.licenseNumber && `License: ${agent.licenseNumber}`}
                      </CardDescription>
                    </div>
                    {agent.rating && (
                      <div className="flex items-center gap-2">
                        <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold">{(agent.rating / 20).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {agent.bio && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground">{agent.bio}</p>
                </div>
              )}

              {agent.specialization && (
                <div>
                  <h3 className="font-semibold mb-2">Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(agent.specialization).map((spec: string, idx: number) => (
                      <span key={idx} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <h3 className="font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {agent.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span>{agent.phone}</span>
                      </div>
                    )}
                    {agent.website && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <a href={agent.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {agent.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-3xl font-bold text-primary">{agent.totalSales || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Sales</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-3xl font-bold text-primary">{agent.activeListings || 0}</div>
                      <div className="text-sm text-muted-foreground">Active Listings</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                {isAuthenticated ? (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full">
                        <Mail className="h-5 w-5 mr-2" />
                        Contact Agent
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Message</DialogTitle>
                        <DialogDescription>
                          Send a message to {agent.agency || 'this agent'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            placeholder="I'm interested in your services..."
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            rows={5}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSendMessage} disabled={sendMessageMutation.isPending}>
                          {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button size="lg" className="w-full" asChild>
                    <a href={getLoginUrl()}>Sign In to Contact Agent</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
