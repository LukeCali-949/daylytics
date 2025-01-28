"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { MessageSquare, Send } from "lucide-react"
import { ScrollArea } from "~/components/ui/scrollarea"

export default function ChatWindow() {
  const [messages] = useState([
    "Welcome to your productivity dashboard!",
    "You can track your habits and goals here.",
    "Try adding some charts to visualize your progress.",
    "Need help? Just ask!",
  ])

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="border-b border-border p-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h2 className="font-semibold">Chat Assistant</h2>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((message, i) => (
            <div key={i} className="rounded-lg bg-muted p-4 text-sm">
              {message}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <form className="flex gap-4">
          <Input placeholder="Type your message..." className="flex-1" />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  )
}

