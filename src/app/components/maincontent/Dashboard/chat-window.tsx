"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea, ScrollBar } from "~/components/ui/scrollarea";
import { Send, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "~/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SidebarProps {
  className?: string;
  onSubmit: (message: string) => Promise<void>;
}

export function Sidebar({ className, onSubmit }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    try {
      const res = await fetch("/api/db/getConversationHistory");
      if (res.ok) {
        const data = await res.json();
        setConversation(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  useEffect(() => {
    fetchConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSending(true);
    const newMessage = message.trim();
    
    try {
      setConversation(prev => [...prev, { role: "user", content: newMessage }]);
      setMessage("");
      await onSubmit(newMessage);
      await fetchConversation();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card
      className={cn(
        className,
        "dark:bg-black dark:border-white/20 transition-all duration-300 ease-in-out relative flex flex-col h-full",
        isCollapsed ? "w-16" : "w-[350px]"
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className="absolute -left-6 top-4 z-10 rounded-full dark:bg-white dark:text-black dark:hover:bg-white/90 dark:border-white/20"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      <div className={cn(
        "flex flex-col h-full",
        isCollapsed ? "opacity-0" : "opacity-100"
      )}>
        {/* Header */}
        <div className="border-b p-4 dark:border-white/20">
          <h2 className="text-lg font-semibold dark:text-white">Chat Assistant</h2>
        </div>

        {/* Scrollable Conversation Area */}
        <ScrollArea className="flex-1 relative">
          <div
            ref={scrollRef}
            className="p-4 space-y-4 h-full overflow-y-auto "
            style={{ maxHeight: 'calc(100vh - 160px)' }}
          >
            {conversation.length === 0 && (
              <div className="rounded-lg bg-muted/50 p-4 dark:bg-white/10">
                <p className="text-sm text-muted-foreground dark:text-white/70">
                  Welcome! I'm here to help you track your habits and goals.
                </p>
              </div>
            )}
            
            {conversation.map((msg, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-blue-100 text-blue-800 ml-auto"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* Sticky Input Area */}
        <div className="border-t p-4 dark:border-white/20 sticky bottom-0 bg-background">
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 dark:bg-black dark:border-white/20 dark:text-white"
              disabled={isSending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || isSending}
              className="dark:bg-white dark:text-black hover:dark:bg-white/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}