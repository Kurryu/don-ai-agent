import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, MessageSquare, Upload, Image as ImageIcon, Sparkles, Trash2 } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import FileUploadZone from "@/components/FileUploadZone";
import FileList from "@/components/FileList";
import ImageGallery from "@/components/ImageGallery";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => {
        // Replace the temporary user message with the one that has an ID
        const tempUserMessage = prev.find(msg => msg.id === -1);
        const updatedMessages = tempUserMessage ? prev.filter(msg => msg.id !== -1) : prev;

        return [
          ...updatedMessages,
          { id: response.messageId, role: "assistant", content: response.message },
        ];
      });
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setIsLoading(false);
    },
  });

  const handleSendMessage = (content: string) => {
    if (!activeConversation) return;
    // Add a temporary message with a placeholder ID (-1) until the real message ID is returned
    setMessages((prev) => [...prev, { id: -1, role: "user", content }]);
    setIsLoading(true);
    chatMutation.mutate({
      conversationId: activeConversation,
      message: content,
    });
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const deleteMessageMutation = trpc.ai.deleteMessage.useMutation({
    onSuccess: (_, variables) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== variables.messageId));
      toast.success("Message deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete message");
      console.error("Delete message error:", error);
    },
  });

  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate({ messageId });
  };

  const generateImageMutation = trpc.ai.generateImage.useMutation({
    onSuccess: () => {
      setIsGeneratingImage(false);
      toast.success("Image generated successfully!");
    },
    onError: (error) => {
      setIsGeneratingImage(false);
      toast.error("Failed to generate image");
      console.error(error);
    },
  });

  const handleGenerateImage = (prompt: string) => {
    if (!activeConversation) return;
    setIsGeneratingImage(true);
    generateImageMutation.mutate({
      conversationId: activeConversation,
      prompt,
    });
  };

  const createConversationMutation = trpc.ai.createConversation.useMutation({
    onSuccess: (conversation) => {
      setActiveConversation(conversation.id);
      setMessages([]);
    },
  });

  const handleCreateNewConversation = () => {
    createConversationMutation.mutate({
      title: `Chat ${new Date().toLocaleDateString()}`,
    });
  };

  const deleteConversationMutation = trpc.ai.deleteConversation.useMutation({
    onSuccess: () => {
      utils.ai.getConversations.invalidate();
      if (activeConversation) {
        setActiveConversation(null);
        setMessages([]);
      }
      toast.success("Conversation deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete conversation");
      console.error("Delete conversation error:", error);
    },
  });

  const handleDeleteConversation = (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversationMutation.mutate({ conversationId });
    }
  };

  const { data: conversationMessages, isLoading: messagesLoading } = trpc.ai.getMessages.useQuery(
    { conversationId: activeConversation! },
    { enabled: !!activeConversation, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (conversationMessages) {
      // The server-side message type has an ID, but the client-side Message type
      // in AIChatBox.tsx was missing it. Now that it's added, we can safely cast.
      setMessages(conversationMessages as Message[]);
    }
  }, [conversationMessages]);

  const { data: conversations, isLoading: conversationsLoading } = trpc.ai.getConversations.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">{APP_TITLE}</h1>
          <p className="text-lg text-muted-foreground">
            Your unlimited AI assistant for chat, file processing, and image generation
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Card className="p-6 text-center flex-1 min-w-[200px]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Chat</h3>
              <p className="text-sm text-muted-foreground">Real-time AI conversations</p>
            </Card>
            <Card className="p-6 text-center flex-1 min-w-[200px]">
              <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Files</h3>
              <p className="text-sm text-muted-foreground">Upload and analyze files</p>
            </Card>
            <Card className="p-6 text-center flex-1 min-w-[200px]">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Images</h3>
              <p className="text-sm text-muted-foreground">Generate AI images</p>
            </Card>
          </div>
        </div>
        <Button size="lg" onClick={() => window.location.href = getLoginUrl()}>
          <Sparkles className="w-4 h-4 mr-2" />
          Login with Manus
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
	          <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
	          <div className="flex items-center gap-2">
	            <ThemeToggle />
	            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
	            <Button variant="outline" size="sm" onClick={() => logout()}>
	              Logout
	            </Button>
	          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            {conversationsLoading ? (
              <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-96">
                <Card className="lg:col-span-1 overflow-hidden flex flex-col">
                  <div className="p-4 border-b space-y-2">
                    <h3 className="font-semibold">Conversations</h3>
                    <Button
                      className="w-full"
                      onClick={handleCreateNewConversation}
                      disabled={createConversationMutation.isPending}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 p-2">
                    {conversations && conversations.length > 0 ? (
                      conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className="flex items-center gap-2 group"
                        >
                          <Button
                            variant={activeConversation === conv.id ? "default" : "ghost"}
                            className="flex-1 justify-start text-left truncate"
                            onClick={() => setActiveConversation(conv.id)}
                          >
                            {conv.title}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            disabled={deleteConversationMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No conversations yet
                      </p>
                    )}
                  </div>
                </Card>

                <Card className="lg:col-span-3 overflow-hidden flex flex-col">
                  {activeConversation ? (
                    <AIChatBox
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      onDeleteMessage={handleDeleteMessage}
                      onGenerateImage={handleGenerateImage}
                      isLoading={isLoading || messagesLoading}
                      isGeneratingImage={isGeneratingImage}
                      height="100%"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>Select a conversation or create a new one to start chatting</p>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            {activeConversation ? (
              <div className="space-y-6">
                <FileUploadZone conversationId={activeConversation} />
                <FileList conversationId={activeConversation} />
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                <p>Select a conversation first to upload files</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            {activeConversation ? (
              <ImageGallery conversationId={activeConversation} />
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                <p>Select a conversation to view generated images</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
