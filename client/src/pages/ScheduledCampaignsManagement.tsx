import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Mail,
  Clock,
  Users,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function ScheduledCampaignsManagement() {
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSequenceDialogOpen, setIsSequenceDialogOpen] = useState(false);

  // Form states
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    status: "draft" as "draft" | "active" | "paused" | "completed",
    triggerType: "manual" as any,
    startDate: "",
    endDate: "",
  });

  const [sequenceForm, setSequenceForm] = useState({
    sequenceOrder: 1,
    templateId: 0,
    delayDays: 0,
    delayHours: 0,
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: campaigns, isLoading } = trpc.scheduledCampaigns.getAllCampaigns.useQuery();
  const { data: selectedCampaignData } = trpc.scheduledCampaigns.getCampaign.useQuery(
    { id: selectedCampaign! },
    { enabled: !!selectedCampaign }
  );
  const { data: subscribers } = trpc.scheduledCampaigns.getSubscribers.useQuery(
    { campaignId: selectedCampaign! },
    { enabled: !!selectedCampaign }
  );

  // Mutations
  const createCampaign = trpc.scheduledCampaigns.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign created successfully");
      setIsCreateDialogOpen(false);
      resetCampaignForm();
      utils.scheduledCampaigns.getAllCampaigns.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  const updateCampaign = trpc.scheduledCampaigns.updateCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign updated successfully");
      utils.scheduledCampaigns.getAllCampaigns.invalidate();
      utils.scheduledCampaigns.getCampaign.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });

  const deleteCampaign = trpc.scheduledCampaigns.deleteCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted successfully");
      setSelectedCampaign(null);
      utils.scheduledCampaigns.getAllCampaigns.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });

  const addSequence = trpc.scheduledCampaigns.addSequence.useMutation({
    onSuccess: () => {
      toast.success("Sequence added successfully");
      setIsSequenceDialogOpen(false);
      resetSequenceForm();
      utils.scheduledCampaigns.getCampaign.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to add sequence: ${error.message}`);
    },
  });

  const deleteSequence = trpc.scheduledCampaigns.deleteSequence.useMutation({
    onSuccess: () => {
      toast.success("Sequence deleted successfully");
      utils.scheduledCampaigns.getCampaign.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete sequence: ${error.message}`);
    },
  });

  const processEmails = trpc.scheduledCampaigns.processScheduledEmails.useMutation({
    onSuccess: (data) => {
      toast.success(`Processed ${data.emailsSent} scheduled emails`);
    },
    onError: (error) => {
      toast.error(`Failed to process emails: ${error.message}`);
    },
  });

  const resetCampaignForm = () => {
    setCampaignForm({
      name: "",
      description: "",
      status: "draft",
      triggerType: "manual",
      startDate: "",
      endDate: "",
    });
  };

  const resetSequenceForm = () => {
    setSequenceForm({
      sequenceOrder: 1,
      templateId: 0,
      delayDays: 0,
      delayHours: 0,
    });
  };

  const handleCreateCampaign = () => {
    createCampaign.mutate(campaignForm);
  };

  const handleToggleCampaignStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    updateCampaign.mutate({
      id,
      data: { status: newStatus as any },
    });
  };

  const handleDeleteCampaign = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaign.mutate({ id });
    }
  };

  const handleAddSequence = () => {
    if (!selectedCampaign) return;
    addSequence.mutate({
      campaignId: selectedCampaign,
      ...sequenceForm,
    });
  };

  const handleDeleteSequence = (id: number) => {
    if (confirm("Are you sure you want to delete this sequence?")) {
      deleteSequence.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      active: "default",
      paused: "outline",
      completed: "secondary",
    };

    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage drip sequences and triggered campaigns
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => processEmails.mutate()}
            disabled={processEmails.isPending}
          >
            <Mail className="w-4 h-4 mr-2" />
            Process Scheduled
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new email campaign with automated sequences
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="Welcome Series"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={campaignForm.description}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, description: e.target.value })
                    }
                    placeholder="Describe the purpose of this campaign..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="triggerType">Trigger Type</Label>
                    <Select
                      value={campaignForm.triggerType}
                      onValueChange={(value) =>
                        setCampaignForm({ ...campaignForm, triggerType: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="signup">User Signup</SelectItem>
                        <SelectItem value="property_view">Property View</SelectItem>
                        <SelectItem value="saved_search">Saved Search</SelectItem>
                        <SelectItem value="offer_submitted">Offer Submitted</SelectItem>
                        <SelectItem value="tour_booked">Tour Booked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={campaignForm.status}
                      onValueChange={(value) =>
                        setCampaignForm({ ...campaignForm, status: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date (Optional)</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={campaignForm.startDate}
                      onChange={(e) =>
                        setCampaignForm({ ...campaignForm, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={campaignForm.endDate}
                      onChange={(e) =>
                        setCampaignForm({ ...campaignForm, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign} disabled={createCampaign.isPending}>
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>Select a campaign to view details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading campaigns...</p>
            ) : !campaigns || campaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No campaigns yet</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCampaign === campaign.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedCampaign(campaign.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {campaign.sequences.length} sequences
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(campaign.status)}
                      <Badge variant="outline">{campaign.triggerType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Details */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedCampaign ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Select a campaign to view details</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Campaign Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedCampaignData?.name}</CardTitle>
                      <CardDescription>{selectedCampaignData?.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleCampaignStatus(
                            selectedCampaign,
                            selectedCampaignData?.status || "draft"
                          )
                        }
                      >
                        {selectedCampaignData?.status === "active" ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCampaign(selectedCampaign)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{subscribers?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Subscribers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {selectedCampaignData?.sequences.length || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Sequences</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {selectedCampaignData?.startDate
                            ? new Date(selectedCampaignData.startDate).toLocaleDateString()
                            : "No start date"}
                        </p>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Sequences */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Email Sequences</CardTitle>
                      <CardDescription>Automated email drip sequence</CardDescription>
                    </div>
                    <Dialog open={isSequenceDialogOpen} onOpenChange={setIsSequenceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Sequence
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Email Sequence</DialogTitle>
                          <DialogDescription>
                            Add a new step to the campaign sequence
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="sequenceOrder">Sequence Order</Label>
                              <Input
                                id="sequenceOrder"
                                type="number"
                                min="1"
                                value={sequenceForm.sequenceOrder}
                                onChange={(e) =>
                                  setSequenceForm({
                                    ...sequenceForm,
                                    sequenceOrder: parseInt(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="templateId">Template ID</Label>
                              <Input
                                id="templateId"
                                type="number"
                                min="1"
                                value={sequenceForm.templateId || ""}
                                onChange={(e) =>
                                  setSequenceForm({
                                    ...sequenceForm,
                                    templateId: parseInt(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="delayDays">Delay (Days)</Label>
                              <Input
                                id="delayDays"
                                type="number"
                                min="0"
                                value={sequenceForm.delayDays}
                                onChange={(e) =>
                                  setSequenceForm({
                                    ...sequenceForm,
                                    delayDays: parseInt(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="delayHours">Delay (Hours)</Label>
                              <Input
                                id="delayHours"
                                type="number"
                                min="0"
                                max="23"
                                value={sequenceForm.delayHours}
                                onChange={(e) =>
                                  setSequenceForm({
                                    ...sequenceForm,
                                    delayHours: parseInt(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsSequenceDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddSequence} disabled={addSequence.isPending}>
                            Add Sequence
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedCampaignData?.sequences ||
                  selectedCampaignData.sequences.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No sequences yet. Add your first email sequence.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedCampaignData.sequences.map((sequence, index) => (
                        <div
                          key={sequence.id}
                          className="flex items-start gap-4 p-4 border rounded-lg"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                            {sequence.sequenceOrder}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{sequence.templateName}</p>
                            <p className="text-sm text-muted-foreground">
                              {sequence.templateSubject}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Delay: {sequence.delayDays} days, {sequence.delayHours} hours
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSequence(sequence.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscribers */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscribers</CardTitle>
                  <CardDescription>Users enrolled in this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  {!subscribers || subscribers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No subscribers yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subscribed At</TableHead>
                          <TableHead>Last Sent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscribers.map((subscriber) => (
                          <TableRow key={subscriber.id}>
                            <TableCell>{subscriber.userId}</TableCell>
                            <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                            <TableCell>
                              {new Date(subscriber.subscribedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {subscriber.lastSentSequence
                                ? `Sequence ${subscriber.lastSentSequence}`
                                : "None"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
