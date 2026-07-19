import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Mail, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Messages() {
  const { user, isAuthenticated } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: messages, refetch } = trpc.messages.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: unreadCount } = trpc.messages.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const sendMessageMutation = trpc.messages.send.useMutation();
  const markAsReadMutation = trpc.messages.markAsRead.useMutation();

  // Group messages by conversation
  const conversations = messages?.reduce((acc, msg) => {
    const otherUserId = msg.senderId === user?.id ? msg.receiverId : msg.senderId;
    if (!acc[otherUserId]) {
      acc[otherUserId] = [];
    }
    acc[otherUserId].push(msg);
    return acc;
  }, {} as Record<number, typeof messages>) || {};

  const handleSelectConversation = async (userId: number) => {
    setSelectedConversation(userId);
    
    // Mark messages as read
    const unreadMessages = conversations[userId]?.filter(
      m => m.receiverId === user?.id && m.isRead === 0
    );
    
    for (const msg of unreadMessages || []) {
      await markAsReadMutation.mutateAsync({ messageId: msg.id });
    }
    
    refetch();
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyContent.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        receiverId: selectedConversation,
        content: replyContent,
      });
      
      setReplyContent("");
      refetch();
      toast.success("Message sent!");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your messages</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedMessages = selectedConversation ? conversations[selectedConversation] : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.keys(conversations).length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {Object.entries(conversations).map(([userId, msgs]) => {
                    const latestMsg = msgs[0];
                    const hasUnread = msgs.some(m => m.receiverId === user?.id && m.isRead === 0);
                    
                    return (
                      <button
                        key={userId}
                        onClick={() => handleSelectConversation(parseInt(userId))}
                        className={`w-full p-4 text-left hover:bg-muted transition-colors ${
                          selectedConversation === parseInt(userId) ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">User {userId}</p>
                              {hasUnread && (
                                <span className="h-2 w-2 bg-primary rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {latestMsg.content}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(latestMsg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Thread */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedConversation ? `Conversation with User ${selectedConversation}` : 'Select a conversation'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedMessages ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Messages */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedMessages.slice().reverse().map(msg => {
                      const isSent = msg.senderId === user?.id;
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-4 ${
                              isSent
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.subject && (
                              <p className="font-semibold mb-1">{msg.subject}</p>
                            )}
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-2 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Box */}
                  <div className="border-t pt-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={sendMessageMutation.isPending || !replyContent.trim()}
                        size="icon"
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
