"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
  Users,
  Tags,
  Upload,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transações", href: "/transactions", icon: CreditCard },
  { name: "Categorias", href: "/categories", icon: Tags },
  { name: "Importação", href: "/import", icon: Upload },
  { name: "Conciliação", href: "/reconciliation", icon: RefreshCw },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Análises", href: "/analytics", icon: BarChart3 },
  { name: "Usuários", href: "/users", icon: Users },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r dark:bg-gray-800 dark:border-gray-700">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-bold">Controle Financeiro</h2>
      </div>
      <div className="flex flex-col flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn("w-full justify-start", isActive && "bg-gray-100 dark:bg-gray-700")}
              >
                <Icon className="mr-2 h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
