import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, User, Clock, Home, Users, CalendarDays, Shield } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useNavigate } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown"

export function Header() {
  const pageTitle = usePageTitle()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <header className="bg-gradient-to-r from-primary/90 via-primary to-primary/90 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 border-b border-border/30 pl-14 pr-3 sm:pl-6 sm:pr-6 md:px-6 py-3 sm:py-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 mr-2 justify-center md:justify-start">
          <h2 className="text-base sm:text-lg md:text-2xl font-bold text-balance text-primary-foreground truncate text-center md:text-left">{pageTitle}</h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 sm:h-10 sm:w-10"
            onClick={() => setOpen(true)}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <NotificationsDropdown />
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10 hidden sm:flex h-8 w-8 sm:h-10 sm:w-10"
            title="Mi perfil"
            onClick={() => navigate("/perfil")}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary-foreground/10 rounded-md text-primary-foreground text-sm font-mono">
            <Clock className="w-4 h-4" />
            {formatTime(currentTime)}
          </div>
        </div>

        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Buscar páginas..." />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup heading="Páginas">
              <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/pacientes"))}>
                <Users className="mr-2 h-4 w-4" />
                Pacientes
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/citas"))}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Citas
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/horarios"))}>
                <Clock className="mr-2 h-4 w-4" />
                Horarios
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/perfil"))}>
                <User className="mr-2 h-4 w-4" />
                Mi perfil
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/usuarios"))}>
                <Shield className="mr-2 h-4 w-4" />
                Usuarios
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </header>
  )
}
