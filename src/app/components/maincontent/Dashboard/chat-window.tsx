"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { ScrollArea } from "~/components/ui/scrollarea"
import { Send, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "~/lib/utils"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <Card
      className={cn(
        className,
        "dark:bg-black dark:border-white/20 transition-all duration-300 ease-in-out relative",
        isCollapsed ? "w-16" : "w-[350px]",
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className="absolute  -left-6 top-4 z-10 rounded-full dark:bg-white dark:text-black dark:hover:bg-white/90 dark:border-white/20"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
      <div
        className={cn(
          "flex h-full flex-col transition-opacity duration-300",
          isCollapsed ? "opacity-0" : "opacity-100",
        )}
      >
        <div className="border-b p-4 dark:border-white/20 ">
          <h2 className="text-lg font-semibold dark:text-white">Chat Assistant</h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Placeholder for chat messages */}
            <div className="rounded-lg bg-muted/50 p-4 dark:bg-white/10">
              <p className="text-sm text-muted-foreground dark:text-white/70">
                Welcome! I'm here to help you track your habits and goals. How can I assist you today?
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t p-4 dark:border-white/20">
          <form className="flex gap-2">
            <Input
              placeholder="Type your message..."
              className="flex-1 dark:bg-black dark:border-white/20 dark:text-white dark:placeholder:text-white/50"
            />
            <Button size="icon" type="submit" className="dark:bg-white dark:text-black hover:dark:bg-white/90">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </Card>
  )
}

