import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  TrendingUp,
  Users,
  Mail,
  Clock,
  BarChart3,
  UserX,
  UserCheck,
} from "lucide-react";

export default function ReEngagementCampaigns() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = trpc.reEngagement.getCampaigns.useQuery();

  // Fetch inactive users
  const { data: inactiveUsers } = trpc.reEngagement.getInactiveUsers.useQuery();

  // Fetch analytics for selected campaign
  const { data: analytics } = trpc.reEngagement.getAnalytics.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );

  // Mutations
  const createCampaign = trpc.reEngagement.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Re-engagement campaign created");
      setShowCreateDialog(false);
      utils.reEngagement.getCampaigns.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  const startCampaign = trpc.reEngagement.startCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(`Campaign started. ${data.triggered} users triggered.`);
      utils.reEngagement.getCampaigns.invalidate();
      utils.reEngagement.getInactiveUsers.invalidate();
    },
  });

  const pauseCampaign = trpc.reEngagement.pauseCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign paused");
      utils.reEngagement.getCampaigns.invalidate();
    },
  });

  const deleteCampaign = trpc.reEngagement.deleteCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      utils.reEngagement.getCampaigns.invalidate();
      setSelectedCampaignId(null);
    },
  });

  const processEmails = trpc.reEngagement.processScheduledEmails.useMutation({
    onSuccess: (data) => {
      toast.success(`Processed ${data.processed} scheduled emails`);
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Re-engagement Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Automatically re-engage inactive users with targeted email sequences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => processEmails.mutate()}>
            <Mail className="mr-2 h-4 w-4" />
            Process Scheduled Emails
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateCampaignForm
                onSubmit={(data) => createCampaign.mutate(data)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="inactive-users">Inactive Users</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {campaignsLoading && <div>Loading campaigns...</div>}

          {campaigns && campaigns.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No re-engagement campaigns yet</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          )}

          {campaigns && campaigns.length > 0 && (
            <div className="grid gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="cursor-pointer hover:border-primary" onClick={() => setSelectedCampaignId(campaign.id)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{campaign.name}</CardTitle>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>
                      <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <MetricCard
                        icon={<Clock className="h-4 w-4" />}
                        label="Inactivity Threshold"
                        value={`${campaign.inactivityDays} days`}
                      />
                      <MetricCard
                        icon={<Mail className="h-4 w-4" />}
                        label="Max Emails"
                        value={campaign.maxEmails}
                      />
                      <MetricCard
                        icon={<Users className="h-4 w-4" />}
                        label="Triggered"
                        value={campaign.totalTriggered}
                      />
                      <MetricCard
                        icon={<UserCheck className="h-4 w-4" />}
                        label="Re-engaged"
                        value={campaign.totalReEngaged}
                      />
                    </div>

                    <div className="flex gap-2">
                      {campaign.status === "draft" && (
                        <Button size="sm" onClick={(e) => {
                          e.stopPropagation();
                          startCampaign.mutate({ campaignId: campaign.id });
                        }}>
                          <Play className="mr-2 h-4 w-4" />
                          Start
                        </Button>
                      )}
                      {campaign.status === "active" && (
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          pauseCampaign.mutate({ campaignId: campaign.id });
                        }}>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCampaignId(campaign.id);
                        }}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this campaign?")) {
                            deleteCampaign.mutate({ campaignId: campaign.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedCampaignId && analytics && (
            <Dialog open={!!selectedCampaignId} onOpenChange={() => setSelectedCampaignId(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Campaign Analytics</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Triggered</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{analytics.totalTriggered}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Re-engaged</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{analytics.totalReEngaged}</p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.reEngagementRate.toFixed(1)}% rate
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Unsubscribed</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{analytics.totalUnsubscribed}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Emails Sent</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analytics.emailsSent}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Open Rate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analytics.openRate.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.emailsOpened} opened
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Click Rate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analytics.clickRate.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.emailsClicked} clicked
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="inactive-users">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Users Report</CardTitle>
              <CardDescription>
                Users who haven't logged in recently and may need re-engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inactiveUsers && inactiveUsers.length === 0 && (
                <div className="text-center py-8">
                  <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No inactive users found</p>
                </div>
              )}

              {inactiveUsers && inactiveUsers.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Days Inactive</TableHead>
                      <TableHead>Engagement Score</TableHead>
                      <TableHead>In Campaign</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>{user.userName}</TableCell>
                        <TableCell>{user.userEmail}</TableCell>
                        <TableCell>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>{user.daysSinceLastLogin}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.engagementScore > 70
                                ? "default"
                                : user.engagementScore > 40
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {user.engagementScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isInCampaign ? (
                            <Badge variant="outline">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function CreateCampaignForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    inactivityDays: 30,
    targetSegment: "all" as "all" | "buyers" | "sellers" | "agents",
    delayBetweenEmails: 3,
    maxEmails: 3,
    emailSequence: [
      { subject: "We miss you!", content: "Come back and see what's new..." },
      { subject: "Special offer just for you", content: "Here's an exclusive offer..." },
      { subject: "Last chance", content: "This is your final reminder..." },
    ],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateEmail = (index: number, field: "subject" | "content", value: string) => {
    const newSequence = [...formData.emailSequence];
    newSequence[index] = { ...newSequence[index], [field]: value };
    setFormData({ ...formData, emailSequence: newSequence });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Create Re-engagement Campaign</DialogTitle>
        <DialogDescription>
          Set up an automated email sequence to re-engage inactive users
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Campaign Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., 30-Day Inactive Users"
            required
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe this campaign..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Inactivity Threshold (days)</Label>
            <Input
              type="number"
              min="1"
              value={formData.inactivityDays}
              onChange={(e) => setFormData({ ...formData, inactivityDays: Number(e.target.value) })}
            />
          </div>

          <div>
            <Label>Target Segment</Label>
            <Select
              value={formData.targetSegment}
              onValueChange={(value: any) => setFormData({ ...formData, targetSegment: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="buyers">Buyers Only</SelectItem>
                <SelectItem value="sellers">Sellers Only</SelectItem>
                <SelectItem value="agents">Agents Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Delay Between Emails (days)</Label>
            <Input
              type="number"
              min="1"
              value={formData.delayBetweenEmails}
              onChange={(e) =>
                setFormData({ ...formData, delayBetweenEmails: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <Label>Maximum Emails</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={formData.maxEmails}
              onChange={(e) => setFormData({ ...formData, maxEmails: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold">Email Sequence</h3>
          {formData.emailSequence.map((email, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-md">
              <Label>Email {index + 1}</Label>
              <Input
                placeholder="Subject line"
                value={email.subject}
                onChange={(e) => updateEmail(index, "subject", e.target.value)}
              />
              <Textarea
                placeholder="Email content"
                value={email.content}
                onChange={(e) => updateEmail(index, "content", e.target.value)}
                rows={3}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Campaign</Button>
      </div>
    </form>
  );
}
