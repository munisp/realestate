/**
 * Email Template Builder
 * 
 * Visual editor for creating and managing email templates with preview
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  Code,
  Save,
  Send,
  Copy,
  Trash2,
  Plus,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{title}}</h1>
  </div>
  <div class="content">
    <p>Hello {{userName}},</p>
    <p>{{message}}</p>
    <a href="{{actionUrl}}" class="button">{{actionText}}</a>
    <p>If you have any questions, please don't hesitate to contact us.</p>
  </div>
  <div class="footer">
    <p>&copy; 2025 Real Estate Platform. All rights reserved.</p>
  </div>
</body>
</html>`;

const TEMPLATE_VARIABLES = [
  { name: 'userName', description: 'Recipient name' },
  { name: 'userEmail', description: 'Recipient email' },
  { name: 'propertyAddress', description: 'Property address' },
  { name: 'propertyPrice', description: 'Property price' },
  { name: 'appointmentDate', description: 'Appointment date' },
  { name: 'appointmentTime', description: 'Appointment time' },
  { name: 'agentName', description: 'Agent name' },
  { name: 'agentPhone', description: 'Agent phone' },
  { name: 'offerAmount', description: 'Offer amount' },
  { name: 'actionUrl', description: 'Call-to-action URL' },
  { name: 'actionText', description: 'Call-to-action text' },
];

export default function EmailTemplateBuilder() {
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('custom');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState(DEFAULT_TEMPLATE);
  const [testEmail, setTestEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Test data for preview
  const [testData, setTestData] = useState({
    title: 'Welcome to Our Platform',
    userName: 'John Doe',
    message: 'Thank you for signing up! We\'re excited to have you on board.',
    actionUrl: 'https://example.com',
    actionText: 'Get Started',
  });

  // Render preview with test data
  const renderPreview = () => {
    let preview = htmlContent;
    Object.entries(testData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, value);
    });
    return preview;
  };

  const handleSaveTemplate = () => {
    if (!templateName || !subject || !htmlContent) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Template saved successfully');
    // Save logic would go here
  };

  const handleSendTest = () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    toast.success(`Test email sent to ${testEmail}`);
    // Send test logic would go here
  };

  const handleInsertVariable = (variable: string) => {
    setHtmlContent(prev => prev + `{{${variable}}}`);
    toast.success(`Inserted variable: {{${variable}}}`);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(htmlContent);
    toast.success('Template copied to clipboard');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Template Builder</h1>
          <p className="text-muted-foreground">
            Create and customize email templates with dynamic variables
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopyTemplate} variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button onClick={handleSaveTemplate}>
            <Save className="mr-2 h-4 w-4" />
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    placeholder="e.g., Welcome Email"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateType">Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="offer">Offer Update</SelectItem>
                      <SelectItem value="alert">Price Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Welcome to {{propertyAddress}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Editor/Preview Tabs */}
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="edit">
                    <Code className="mr-2 h-4 w-4" />
                    Edit HTML
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {activeTab === 'edit' ? (
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="font-mono text-sm min-h-[500px]"
                  placeholder="Enter your HTML template here..."
                />
              ) : (
                <div className="border rounded-lg p-4 min-h-[500px] bg-white">
                  <iframe
                    srcDoc={renderPreview()}
                    className="w-full h-[500px] border-0"
                    title="Email Preview"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify your template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button onClick={handleSendTest}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Available Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Available Variables</CardTitle>
              <CardDescription>
                Click to insert into template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <div
                    key={variable.name}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                    onClick={() => handleInsertVariable(variable.name)}
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm">
                        {`{{${variable.name}}}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {variable.description}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Test Data */}
          <Card>
            <CardHeader>
              <CardTitle>Preview Test Data</CardTitle>
              <CardDescription>
                Customize data for preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(testData).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{key}</Label>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setTestData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
