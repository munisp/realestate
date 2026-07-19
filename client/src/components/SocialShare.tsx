import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Facebook, Twitter, Linkedin, Mail, Link as LinkIcon, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
}

export function SocialShare({ url, title, description, imageUrl }: SocialShareProps) {
  const [open, setOpen] = useState(false);
  
  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);
  const shareDescription = encodeURIComponent(description || "");

  const socialLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: "text-blue-600",
    },
    {
      name: "Twitter",
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
      color: "text-sky-500",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: "text-blue-700",
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      url: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
      color: "text-green-600",
    },
    {
      name: "Email",
      icon: Mail,
      url: `mailto:?subject=${shareTitle}&body=${shareDescription}%0A%0A${shareUrl}`,
      color: "text-gray-600",
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleShare = (socialUrl: string) => {
    window.open(socialUrl, "_blank", "width=600,height=400");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this property</DialogTitle>
          <DialogDescription>
            Share on social media or copy the link
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Social Media Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {socialLinks.map((social) => (
              <Button
                key={social.name}
                variant="outline"
                className="flex-col h-auto py-3 gap-2"
                onClick={() => handleShare(social.url)}
              >
                <social.icon className={`w-5 h-5 ${social.color}`} />
                <span className="text-xs">{social.name}</span>
              </Button>
            ))}
          </div>

          {/* Copy Link */}
          <div className="flex gap-2">
            <Input value={url} readOnly />
            <Button onClick={handleCopyLink}>
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>

          {/* Preview Card */}
          {imageUrl && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Preview</p>
              <div className="border rounded overflow-hidden">
                <img src={imageUrl} alt={title} className="w-full h-40 object-cover" />
                <div className="p-3 bg-muted">
                  <h4 className="font-semibold text-sm">{title}</h4>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
