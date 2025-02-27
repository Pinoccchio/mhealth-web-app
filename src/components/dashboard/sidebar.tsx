"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Users, ShieldCheck, Database, LogOut, LayoutDashboard } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "User Management", href: "/dashboard/users", icon: Users },
  { name: "Patients Account Requests", href: "/dashboard/requests", icon: ShieldCheck },
  { name: "Health History Record", href: "/dashboard/health-history-record", icon: Database },
  // { name: "Support Chat", href: "/dashboard/support", icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw authError

      if (user) {
        // Set isUserOnline to "no" for the admin user
        const { error: updateError } = await supabase
          .from("userss")
          .update({ isUserOnline: "no" })
          .eq("uid", user.id)
          .eq("role", "admin")

        if (updateError) {
          console.error("Error updating user online status:", updateError)
        }
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      })
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error signing out",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSignOutDialogOpen(false)
    }
  }

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="px-4 py-6">
            <Link href="/dashboard" className="flex items-center">
              <img src="/official-logo.png" alt="mHealth Logo" className="h-10 w-auto" />
            </Link>
          </div>
          <nav className="px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)

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
          <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
            <AlertDialogTrigger asChild>
              <button className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50">
                <LogOut className="mr-3 h-5 w-5" />
                Sign out
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be logged out of your account and redirected to the login page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSignOut}
                  className={cn("bg-red-500 text-white", "hover:bg-red-600", "focus:ring-red-500")}
                >
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

