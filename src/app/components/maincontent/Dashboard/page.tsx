import { MessageSquare } from "lucide-react"
import ChatWindow from "./chat-window"
import { Card } from "~/components/ui/card"

export default function DashboardPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)]  text-foreground overflow-hidden">
      {/* Container for max-width and centering */}
      <div className="mx-auto w-full max-w-[1500px] p-4 h-full overflow-hidden">
        {/* Main content area */}
        <div className="flex flex-col lg:flex-row gap-4 h-full max-h-full ">
          {/* Charts section */}
          <div className="flex-1 grid grid-cols-2 gap-4 content-between overflow-y-auto my-8 overflow-hidden">
            {/* Top row charts - reduced aspect ratio */}
            <Card className="aspect-[2/1] p-4 flex items-center justify-center border-2 border-dashed border-muted">
              <p className="text-muted-foreground">Chart Area 1</p>
            </Card>
            <Card className="aspect-[2/1] p-4 flex items-center justify-center border-2 border-dashed border-muted">
              <p className="text-muted-foreground">Chart Area 2</p>
            </Card>
            {/* Middle chart - reduced height */}
            <Card className="col-span-2 aspect-[5/2] p-4 flex items-center justify-center border-2 border-dashed border-muted">
              <p className="text-muted-foreground">Chart Area 3 (Larger)</p>
            </Card>
            {/* Bottom row charts - reduced aspect ratio */}
            <Card className="aspect-[2/1] p-4 flex items-center justify-center border-2 border-dashed border-muted">
              <p className="text-muted-foreground">Chart Area 4</p>
            </Card>
            <Card className="aspect-[2/1] p-4 flex items-center justify-center border-2 border-dashed border-muted">
              <p className="text-muted-foreground">Chart Area 5</p>
            </Card>
          </div>

          {/* Chat section */}
          <div className="lg:w-[500px] lg:border-l lg:border-l-border lg:pl-4 h-full overflow-hidden">
            <Card className="h-full overflow-hidden">
              <ChatWindow />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

