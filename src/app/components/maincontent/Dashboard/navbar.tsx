import { Button } from "~/components/ui/button"
import { MoonIcon, SunIcon } from "lucide-react"

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b dark:border-white/20 bg-black">
      <div className="text-2xl font-bold dark:text-white">Daylytics</div>
      <Button variant="outline" size="icon" className="dark:border-white/20">
        <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </nav>
  )
}

