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
    <div className="flex h-screen bg-background">
      <div className="sidebar-print-hide">
        <Sidebar />
      </div>
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        isCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <div className="header-print-hide">
          <Header />
        </div>
        <main className="p-6">
          {children}
        </main>
      </div>
      <NetworkStatus />
    </div>
  )
}
