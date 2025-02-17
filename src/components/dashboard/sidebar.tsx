"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, ShieldCheck, Database, MessageSquare, LogOut } from "lucide-react"

const navigation = [
  { name: "User Management", href: "/dashboard/users", icon: Users },
  { name: "Patients Account Requests", href: "/dashboard/requests", icon: ShieldCheck },
  { name: "Data Management", href: "/dashboard/data", icon: Database },
  { name: "Support Chat", href: "/dashboard/support", icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="px-4 py-6">
            <Link href="/dashboard" className="flex items-center">
              <img
                src="/official-logo.png"
                alt="mHealth Logo"
                className="h-10 w-auto"
              />
            </Link>
          </div>
          <nav className="px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors
                    ${isActive ? "bg-[#4ade80] text-white" : "text-gray-600 hover:bg-gray-50"}
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </Link>
        </div>
      </div>
    </div>
  )
}

