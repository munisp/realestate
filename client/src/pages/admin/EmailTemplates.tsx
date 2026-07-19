import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Eye, Send, RefreshCw } from "lucide-react";

export default function EmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("new_competitor");
  const [testEmail, setTestEmail] = useState<string>("");
  const [previewData, setPreviewData] = useState<Record<string, any>>({});

  const { data: templates } = trpc.emailTemplatePreview.getTemplates.useQuery();
  const { data: sampleData } = trpc.emailTemplatePreview.getSampleData.useQuery(
    { templateId: selectedTemplate },
    { enabled: !!selectedTemplate }
  );

  const { data: preview, refetch: refetchPreview } = trpc.emailTemplatePreview.previewTemplate.useQuery(
    {
      templateId: selectedTemplate,
      data: Object.keys(previewData).length > 0 ? previewData : (sampleData || {}),
    },
    { enabled: !!selectedTemplate }
  );

  const sendTestEmailMutation = trpc.emailTemplatePreview.sendTestEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Test email sent successfully! Message ID: ${result.messageId}`);
      } else {
        toast.error(`Failed to send test email: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const currentTemplate = templates?.find(t => t.id === selectedTemplate);

  const handleLoadSampleData = () => {
    if (sampleData) {
      setPreviewData(sampleData);
      refetchPreview();
      toast.success("Sample data loaded");
    }
  };

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    if (!testEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    sendTestEmailMutation.mutate({
      templateId: selectedTemplate,
      toEmail: testEmail,
      data: Object.keys(previewData).length > 0 ? previewData : (sampleData || {}),
    });
  };

  const handleUpdatePreviewData = (key: string, value: any) => {
    setPreviewData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Template Preview & Testing</h1>
        <p className="text-muted-foreground mt-2">
          Preview and test competitor tracking email templates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Selection</CardTitle>
          <CardDescription>Choose a template to preview and test</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Email Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLoadSampleData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Load Sample Data
            </Button>
          </div>

          {currentTemplate && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="text-sm">
                <strong>Subject:</strong> {currentTemplate.subject}
              </div>
              <div className="text-sm mt-2">
                <strong>Variables:</strong> {currentTemplate.variables.join(", ")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="data">
            <Mail className="h-4 w-4 mr-2" />
            Template Data
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Send Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>Live preview of the rendered email template</CardDescription>
            </CardHeader>
            <CardContent>
              {preview ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <strong>Subject:</strong> {preview.subject}
                  </div>
                  <div
                    className="border rounded-lg p-4 bg-white"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a template and load sample data to preview
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Template Data</CardTitle>
              <CardDescription>
                Customize the data used to render the template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentTemplate?.variables.map((variable) => (
                  <div key={variable}>
                    <Label htmlFor={variable}>{variable}</Label>
                    <Input
                      id={variable}
                      value={previewData[variable] || sampleData?.[variable] || ""}
                      onChange={(e) => handleUpdatePreviewData(variable, e.target.value)}
                      placeholder={`Enter ${variable}`}
                    />
                  </div>
                ))}
                <Button onClick={() => refetchPreview()} className="w-full">
                  Update Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify template rendering and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testEmail">Test Email Address</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    The test email will be sent with "[TEST]" prefix in the subject line
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Current Template Data:</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(
                      Object.keys(previewData).length > 0 ? previewData : sampleData,
                      null,
                      2
                    )}
                  </pre>
                </div>

                <Button
                  onClick={handleSendTestEmail}
                  disabled={sendTestEmailMutation.isPending || !testEmail}
                  className="w-full"
                >
                  {sendTestEmailMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>

                {!process.env.RESEND_API_KEY && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Resend API key is not configured. Please add
                      RESEND_API_KEY to your environment variables to enable email sending.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
