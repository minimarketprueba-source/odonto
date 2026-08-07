'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { NetworkStatus } from '@/components/ui/network-status'
import { useSidebar } from '@/context/sidebar-context'
import { cn } from '@/lib/utils'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import type { FC, ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
  /** Shell compacto para la ficha clínica y el odontograma. */
  clinical?: boolean
  clinicalPatient?: {
    nombres: string
    apellidos: string
    documento: string | null
    fecha_nacimiento: string | null
    sexo: string | null
  }
}

export const AppLayout: FC<AppLayoutProps> = ({ children, clinical = false, clinicalPatient }) => {
  const { isCollapsed } = useSidebar()

  if (clinical) return <ClinicalLayout patient={clinicalPatient}>{children}</ClinicalLayout>

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="sidebar-print-hide">
        <Sidebar />
      </div>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out',
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        )}
      >
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

const clinicalNavigation = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Patient List', href: '/pacientes', icon: Users },
  { label: 'Schedule', href: '/citas', icon: CalendarDays },
  { label: 'Reports', href: '/reportes', icon: ChartNoAxesColumn },
]

const clinicalTools = [
  { label: 'Odontogram', icon: FileText },
  { label: 'Periodontal', icon: ChartNoAxesColumn },
  { label: 'Imaging', icon: FileText },
  { label: 'History', icon: CalendarDays },
  { label: 'Notes', icon: FileText },
]

function ClinicalLayout({ children, patient }: { children: ReactNode; patient?: AppLayoutProps['clinicalPatient'] }) {
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb] text-[#191c1e]">
      <aside className="hidden w-[230px] shrink-0 border-r border-[#d8dadc] bg-white lg:flex lg:flex-col">
        <div className="flex h-[57px] items-center border-b border-[#d8dadc] px-4">
          <span className="text-[18px] font-semibold tracking-[-0.02em] text-[#0061a5]">
            DentoChart Pro
          </span>
        </div>
        <div className="border-b border-[#e6e8ea] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#d2e4ff] text-sm font-semibold text-[#00497e]">
              {patient ? `${patient.nombres[0] ?? ''}${patient.apellidos[0] ?? ''}` : 'P'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold">{patient ? `${patient.nombres} ${patient.apellidos}` : 'Paciente'}</p>
              <p className="text-[11px] text-[#3f4753]">ID: {patient?.documento || 'Sin documento'}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-[11px] text-[#3f4753]">
            <p className="flex justify-between">
              Last Visit: <span className="font-medium text-[#191c1e]">Oct 12, 2023</span>
            </p>
            <p className="flex justify-between">
              Allergies: <span className="font-semibold text-[#ba1a1a]">Penicillin</span>
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {clinicalTools.map(({ label, icon: Icon }, index) => (
            <div
              key={label}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm',
                index === 0 ? 'bg-[#d2e4ff] text-[#3f4753]' : 'text-[#3f4753]'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </div>
          ))}
        </nav>
        <div className="space-y-3 border-t border-[#e6e8ea] p-4">
          <button className="flex w-full items-center justify-center rounded-md bg-[#0d99ff] px-3 py-2.5 text-sm font-medium text-white shadow-sm">
            Complete Exam
          </button>
          <button onClick={logout} className="flex items-center gap-2 px-2 text-sm text-[#3f4753]">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[57px] shrink-0 items-center justify-between border-b border-[#d8dadc] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-7">
            <button className="lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <nav className="hidden items-center gap-7 md:flex">
              {clinicalNavigation.map(({ label, href }) => (
                <Link
                  key={label}
                  to={href}
                  className={cn(
                    'border-b-2 border-transparent py-5 text-sm',
                    location.pathname === href
                      ? 'border-[#0061a5] text-[#0061a5]'
                      : 'whitespace-nowrap text-[#191c1e]'
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden rounded-md bg-[#0d99ff] px-4 py-2.5 text-sm font-medium text-white sm:block">
              New Consultation
            </button>
            <Bell className="h-[18px] w-[18px]" />
            <Settings className="h-[18px] w-[18px]" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d2e4ff] text-xs font-semibold text-[#00497e]">
              DR
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6">
          {children}
        </main>
      </div>
      <NetworkStatus />
    </div>
  )
}
