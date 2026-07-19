import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BookmarkPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SaveSearchDialogProps {
  searchCriteria: Record<string, any>;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SaveSearchDialog({ searchCriteria, variant = "outline", size = "default" }: SaveSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const createMutation = trpc.savedSearches.create.useMutation();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this search");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        searchCriteria: JSON.stringify(searchCriteria),
        notificationsEnabled: notificationsEnabled ? 1 : 0,
      });
      
      toast.success("Search saved successfully!");
      setOpen(false);
      setName("");
      setNotificationsEnabled(true);
    } catch (error) {
      toast.error("Failed to save search. Please try again.");
    }
  };

  // Count active filters
  const activeFiltersCount = Object.values(searchCriteria).filter(
    (value) => value !== undefined && value !== null && value !== ""
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <BookmarkPlus className="h-4 w-4 mr-2" />
          Save Search
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save This Search</DialogTitle>
          <DialogDescription>
            Save your current search filters to quickly access them later. You can also enable notifications for new matching properties.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              placeholder="e.g., 3BR Houses in Lagos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={(checked) => setNotificationsEnabled(checked as boolean)}
            />
            <Label
              htmlFor="notifications"
              className="text-sm font-normal cursor-pointer"
            >
              Notify me when new properties match this search
            </Label>
          </div>

          {activeFiltersCount > 0 && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-1">Active Filters:</p>
              <p className="text-xs text-muted-foreground">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? "s" : ""} applied
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Save Search"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
