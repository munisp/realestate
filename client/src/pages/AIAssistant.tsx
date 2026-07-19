import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Send, Loader2, Sparkles, Home, FileText, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
};

type ChatContext = "general" | "property_search" | "tour_scheduling" | "document_explanation" | "investment_advice";

const CONTEXT_INFO = {
  general: {
    icon: Bot,
    title: "General Assistant",
    description: "Ask me anything about real estate",
    color: "bg-blue-500",
  },
  property_search: {
    icon: Home,
    title: "Property Search",
    description: "Find your dream home",
    color: "bg-green-500",
  },
  tour_scheduling: {
    icon: Calendar,
    title: "Tour Scheduling",
    description: "Schedule property tours",
    color: "bg-purple-500",
  },
  document_explanation: {
    icon: FileText,
    title: "Document Help",
    description: "Understand real estate documents",
    color: "bg-orange-500",
  },
  investment_advice: {
    icon: TrendingUp,
    title: "Investment Advisor",
    description: "Analyze investment potential",
    color: "bg-indigo-500",
  },
};

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<ChatContext>("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const healthQuery = trpc.aiChatbot.healthCheck.useQuery();
  const chatMutation = trpc.aiChatbot.chat.useMutation();

  const isServiceAvailable = healthQuery.data?.status === "healthy" && healthQuery.data?.ollama === "healthy";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chatMutation.mutateAsync({
        messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        context,
      });

      if (result.success) {
        const assistantMessage: Message = {
          role: "assistant",
          content: result.message || "I apologize, but I couldn't generate a response.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast.error(result.error || "Failed to get response");
        
        // Add fallback message
        const fallbackMessage: Message = {
          role: "assistant",
          content: "I apologize, but I'm currently unavailable. Please try again later or contact support for assistance.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallbackMessage]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error("Failed to send message");
      
      // Add error message
      const errorMessage: Message = {
        role: "assistant",
        content: "I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat cleared");
  };

  const ContextIcon = CONTEXT_INFO[context].icon;

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Real Estate Assistant</h1>
        </div>
        <p className="text-muted-foreground">
          Get instant help with property search, document explanations, investment advice, and more
        </p>
      </div>

      {/* Service Status */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {healthQuery.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : isServiceAvailable ? (
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              )}
              <div>
                <p className="font-medium">
                  {healthQuery.isLoading
                    ? "Checking service status..."
                    : isServiceAvailable
                    ? "AI Assistant is online"
                    : "AI Assistant is offline"}
                </p>
                {healthQuery.data?.model && (
                  <p className="text-sm text-muted-foreground">
                    Model: {healthQuery.data.model}
                  </p>
                )}
              </div>
            </div>
            {!isServiceAvailable && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Fallback Mode
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Context Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chat Mode</CardTitle>
              <CardDescription>Choose your assistant type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(CONTEXT_INFO) as ChatContext[]).map((ctx) => {
                const info = CONTEXT_INFO[ctx];
                const Icon = info.icon;
                return (
                  <Button
                    key={ctx}
                    variant={context === ctx ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setContext(ctx)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{info.title}</div>
                      <div className="text-xs opacity-70">{info.description}</div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${CONTEXT_INFO[context].color} text-white`}>
                    <ContextIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{CONTEXT_INFO[context].title}</CardTitle>
                    <CardDescription>{CONTEXT_INFO[context].description}</CardDescription>
                  </div>
                </div>
                {messages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearChat}>
                    Clear Chat
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ask me anything about real estate. I can help you find properties, schedule tours,
                      explain documents, and provide investment advice.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 border rounded-lg text-left">
                        <p className="font-medium mb-1">Example:</p>
                        <p className="text-muted-foreground">"Find me a 3-bedroom house in Lagos"</p>
                      </div>
                      <div className="p-3 border rounded-lg text-left">
                        <p className="font-medium mb-1">Example:</p>
                        <p className="text-muted-foreground">"Analyze this property investment"</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <Streamdown>{message.content}</Streamdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.timestamp && (
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  className="min-h-[60px] resize-none"
                  disabled={chatMutation.isPending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending}
                  size="lg"
                  className="px-6"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setContext("property_search");
          setInput("I'm looking for a 3-bedroom house with a budget of $500,000");
        }}>
          <CardContent className="pt-6">
            <Home className="h-8 w-8 mb-2 text-green-500" />
            <h3 className="font-semibold mb-1">Find Properties</h3>
            <p className="text-sm text-muted-foreground">Search for your dream home</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setContext("investment_advice");
          setInput("What should I look for when investing in real estate?");
        }}>
          <CardContent className="pt-6">
            <TrendingUp className="h-8 w-8 mb-2 text-indigo-500" />
            <h3 className="font-semibold mb-1">Investment Advice</h3>
            <p className="text-sm text-muted-foreground">Get expert investment insights</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setContext("tour_scheduling");
          setInput("I'd like to schedule a tour for next week");
        }}>
          <CardContent className="pt-6">
            <Calendar className="h-8 w-8 mb-2 text-purple-500" />
            <h3 className="font-semibold mb-1">Schedule Tours</h3>
            <p className="text-sm text-muted-foreground">Book property viewings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
