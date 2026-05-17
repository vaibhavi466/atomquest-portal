"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  BarChart2,
  FileSpreadsheet,
  Shield,
  LogOut,
  ScrollText,
  LineChart,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

const navItems = [
  { href: "/admin/dashboard",  label: "Dashboard",       icon: LayoutDashboard  },
  { href: "/admin/users",      label: "User Management", icon: Users            },
  { href: "/admin/reports",    label: "Reports",         icon: BarChart2        },
  { href: "/admin/analytics",  label: "Analytics",       icon: LineChart        },
  { href: "/admin/escalation", label: "Escalations",     icon: AlertTriangle    },
  { href: "/admin/export",     label: "Export Data",     icon: FileSpreadsheet  },
  { href: "/admin/audit",      label: "Audit Trail",     icon: ScrollText       },
  
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <h1 className="text-base font-semibold text-slate-900">GoalTrack</h1>
        <p className="text-xs text-slate-400 mt-0.5">Admin Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <Separator />

      {/* User + Logout */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Shield size={14} className="text-purple-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Admin</p>
            <Badge variant="outline" className="text-xs mt-0.5">Full Access</Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut size={14} className="mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}