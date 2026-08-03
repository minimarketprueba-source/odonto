"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { NetworkStatus } from "@/components/ui/network-status"
import { useSidebar } from "@/context/sidebar-context"
import { cn } from "@/lib/utils"
import type { FC, ReactNode } from "react"

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  const { isCollapsed } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="sidebar-print-hide">
        <Sidebar />
      </div>
      <div className={cn(
        "flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out",
        isCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <div className="header-print-hide flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
      <NetworkStatus />
    </div>
  )
}
