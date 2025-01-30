import { Card } from "~/components/ui/card"
import { Sidebar } from "./chat-window"
import { ScrollArea } from "~/components/ui/scrollarea"
import { Navbar } from "./navbar"

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen ">
      <Navbar />
      <div className="flex flex-1">
        {/* Main content */}
        <div className="flex-1 flex">
          <ScrollArea className="flex-1 p-8">
            <div className="mx-auto max-w-6xl space-y-8">
              {/* Top row - 4 equal squares */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={`top-${i}`} className="relative w-full pt-[100%]">
                    <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
                      <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center dark:border-white/20">
                        <p className="text-sm text-muted-foreground dark:text-white/70">Chart {i + 1}</p>
                      </div>
                      
                    </Card>
                  </div>
                ))}
              </div>

              {/* Middle row - 1 wide rectangle + 2 squares */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 relative w-full pt-[50%]">
                  <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
                    <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center dark:border-white/20">
                      <p className="text-sm text-muted-foreground dark:text-white/70">Wide Chart 1</p>
                    </div>
                    
                  </Card>
                </div>
                {[...Array(2)].map((_, i) => (
                  <div key={`middle-${i}`} className="relative w-full pt-[100%]">
                    <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
                      <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center dark:border-white/20">
                        <p className="text-sm text-muted-foreground dark:text-white/70">Chart {i + 5}</p>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>

              {/* Bottom row - 2 squares + 1 wide rectangle */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={`bottom-${i}`} className="relative w-full pt-[100%]">
                    <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
                      <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center dark:border-white/20">
                        <p className="text-sm text-muted-foreground dark:text-white/70">Chart {i + 7}</p>
                      </div>
                    </Card>
                  </div>
                ))}
                <div className="lg:col-span-2 relative w-full pt-[50%]">
                  <Card className="absolute top-0 left-0 w-full h-full p-4 dark:bg-black dark:border-white/20">
                    <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center dark:border-white/20">
                      <p className="text-sm text-muted-foreground dark:text-white/70">Wide Chart 2</p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Chat Sidebar */}
          <Sidebar className="border-l dark:border-white/20" />
        </div>
      </div>
    </div>
  )
}

