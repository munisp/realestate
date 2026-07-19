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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Eye,
  Save,
  Layout,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Mail,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type BlockCategory = "header" | "text" | "image" | "cta" | "footer" | "custom";

export default function EmailTemplateBuilderAdvanced() {
  const [selectedCategory, setSelectedCategory] = useState<BlockCategory | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  const utils = trpc.useUtils();

  // Fetch blocks
  const { data: blocks, isLoading: blocksLoading } = trpc.emailTemplateBuilder.getBlocks.useQuery(
    selectedCategory === "all" ? {} : { category: selectedCategory }
  );

  // Fetch templates
  const { data: templates } = trpc.emailTemplateBuilder.getTemplates.useQuery();

  // Mutations
  const createBlock = trpc.emailTemplateBuilder.createBlock.useMutation({
    onSuccess: () => {
      toast.success("Template block created");
      setShowCreateDialog(false);
      utils.emailTemplateBuilder.getBlocks.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create block: ${error.message}`);
    },
  });

  const createTemplate = trpc.emailTemplateBuilder.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      setShowTemplateBuilder(false);
      setSelectedBlocks([]);
      setTemplateName("");
      setTemplateDescription("");
      utils.emailTemplateBuilder.getTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const renderTemplate = trpc.emailTemplateBuilder.renderTemplate.useMutation({
    onSuccess: (data) => {
      setPreviewHtml(data.html);
    },
  });

  const seedBlocks = trpc.emailTemplateBuilder.seedDefaultBlocks.useMutation({
    onSuccess: (data) => {
      toast.success(`Seeded ${data.count} default blocks`);
      utils.emailTemplateBuilder.getBlocks.invalidate();
    },
  });

  const deleteBlock = trpc.emailTemplateBuilder.deleteBlock.useMutation({
    onSuccess: () => {
      toast.success("Block deleted");
      utils.emailTemplateBuilder.getBlocks.invalidate();
    },
  });

  const handleAddBlock = (blockId: number) => {
    setSelectedBlocks([...selectedBlocks, blockId]);
  };

  const handleRemoveBlock = (index: number) => {
    setSelectedBlocks(selectedBlocks.filter((_, i) => i !== index));
  };

  const handleMoveBlockUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...selectedBlocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    setSelectedBlocks(newBlocks);
  };

  const handleMoveBlockDown = (index: number) => {
    if (index === selectedBlocks.length - 1) return;
    const newBlocks = [...selectedBlocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setSelectedBlocks(newBlocks);
  };

  const handleCreateTemplate = () => {
    if (!templateName || selectedBlocks.length === 0) {
      toast.error("Please provide a name and select at least one block");
      return;
    }

    createTemplate.mutate({
      name: templateName,
      description: templateDescription,
      blockSequence: selectedBlocks,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "header":
        return <Layout className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "cta":
        return <MousePointerClick className="h-4 w-4" />;
      case "footer":
        return <Mail className="h-4 w-4" />;
      default:
        return <Layout className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Email Template Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create professional email templates with pre-built blocks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedBlocks.mutate()}>
            Seed Default Blocks
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateBlockForm
                onSubmit={(data) => createBlock.mutate(data)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
          <Button onClick={() => setShowTemplateBuilder(true)}>
            <Layout className="mr-2 h-4 w-4" />
            Build Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="blocks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="blocks">Template Blocks</TabsTrigger>
          <TabsTrigger value="templates">My Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Button>
            <Button
              variant={selectedCategory === "header" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("header")}
            >
              <Layout className="mr-2 h-4 w-4" />
              Headers
            </Button>
            <Button
              variant={selectedCategory === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("text")}
            >
              <Type className="mr-2 h-4 w-4" />
              Text
            </Button>
            <Button
              variant={selectedCategory === "cta" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("cta")}
            >
              <MousePointerClick className="mr-2 h-4 w-4" />
              CTA
            </Button>
            <Button
              variant={selectedCategory === "footer" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("footer")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Footers
            </Button>
          </div>

          {blocksLoading && <div>Loading blocks...</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blocks?.map((block) => (
              <Card key={block.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(block.category)}
                      <CardTitle className="text-lg">{block.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{block.category}</Badge>
                  </div>
                  <CardDescription>{block.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md mb-4 max-h-32 overflow-hidden">
                    <div
                      className="text-xs"
                      dangerouslySetInnerHTML={{ __html: block.htmlContent }}
                    />
                  </div>
                  {block.variables && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(block.variables).map((v: string) => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddBlock(block.id)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add to Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Delete this block?")) {
                          deleteBlock.mutate({ blockId: block.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-4">
            {templates?.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!templates || templates.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Layout className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No templates yet</p>
                  <Button className="mt-4" onClick={() => setShowTemplateBuilder(true)}>
                    Create Your First Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Builder Dialog */}
      <Dialog open={showTemplateBuilder} onOpenChange={setShowTemplateBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Build Email Template</DialogTitle>
            <DialogDescription>
              Select and arrange blocks to create your email template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Welcome Email"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
              />
            </div>

            <div>
              <Label>Selected Blocks ({selectedBlocks.length})</Label>
              <ScrollArea className="h-64 border rounded-md p-4">
                {selectedBlocks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No blocks selected. Add blocks from the library above.
                  </p>
                )}
                {selectedBlocks.map((blockId, index) => {
                  const block = blocks?.find((b) => b.id === blockId);
                  if (!block) return null;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 mb-2 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(block.category)}
                        <span className="font-medium">{block.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {block.category}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMoveBlockUp(index)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMoveBlockDown(index)}
                          disabled={index === selectedBlocks.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveBlock(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTemplateBuilder(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateBlockForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "text" as BlockCategory,
    htmlContent: "",
    cssStyles: "",
    variables: [] as string[],
    isPublic: true,
  });

  const [newVariable, setNewVariable] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleAddVariable = () => {
    if (newVariable && !formData.variables.includes(newVariable)) {
      setFormData({ ...formData, variables: [...formData.variables, newVariable] });
      setNewVariable("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create Template Block</DialogTitle>
        <DialogDescription>
          Create a reusable email template block
        </DialogDescription>
      </DialogHeader>

      <div>
        <Label>Block Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Hero Header"
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this block..."
        />
      </div>

      <div>
        <Label>Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value: BlockCategory) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="header">Header</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="cta">CTA</SelectItem>
            <SelectItem value="footer">Footer</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>HTML Content</Label>
        <Textarea
          value={formData.htmlContent}
          onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
          placeholder="<div>Your HTML here. Use {{variable_name}} for variables.</div>"
          className="font-mono text-sm"
          rows={6}
          required
        />
      </div>

      <div>
        <Label>Variables</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value)}
            placeholder="variable_name"
          />
          <Button type="button" onClick={handleAddVariable}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {formData.variables.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="cursor-pointer"
              onClick={() =>
                setFormData({
                  ...formData,
                  variables: formData.variables.filter((variable) => variable !== v),
                })
              }
            >
              {v} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Block</Button>
      </div>
    </form>
  );
}
