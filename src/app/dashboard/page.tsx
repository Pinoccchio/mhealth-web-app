"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Database, MessageSquare } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface DashboardStats {
  totalUsers: number
  pendingVerifications: number
  totalRecords: number
  activeChats: number
}

export default function Dashboard() {
  const [adminName, setAdminName] = useState<string>("")
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingVerifications: 0,
    totalRecords: 0,
    activeChats: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          throw new Error("No authenticated user found")
        }

        // Update isOnline status to true for the admin user
        const { data: updateData, error: updateError } = await supabase
          .from("userss")
          .update({ isOnline: true })
          .eq("uid", user.id)
          .eq("role", "admin")
          .select()

        if (updateError) throw updateError

        console.log("Update result:", updateData)

        // Fetch admin user data
        const { data: userData, error: userError } = await supabase
          .from("userss")
          .select("first_name, middle_name, last_name, isOnline")
          .eq("uid", user.id)
          .eq("role", "admin")
          .single()

        if (userError) {
          console.error("Error fetching user data:", userError)
          throw new Error("Failed to fetch user data")
        }

        if (userData) {
          const fullName = [userData.first_name, userData.middle_name, userData.last_name].filter(Boolean).join(" ")
          setAdminName(fullName)
          console.log("Admin user data:", userData)
        } else {
          throw new Error("No admin user found")
        }

        // Fetch total users count
        const { count: totalUsers, error: totalUsersError } = await supabase
          .from("userss")
          .select("*", { count: "exact", head: true })

        if (totalUsersError) throw totalUsersError

        // Fetch pending verifications count from request_acc table
        const { count: pendingVerifications, error: pendingVerificationsError } = await supabase
          .from("request_acc")
          .select("*", { count: "exact", head: true })

        if (pendingVerificationsError) throw pendingVerificationsError

        // Fetch total records count (sum of users and pending requests)
        const totalRecords = (totalUsers || 0) + (pendingVerifications || 0)

        // For active chats, we'll use a placeholder value since we don't have a chats table
        const activeChats = 0

        setStats({
          totalUsers: totalUsers || 0,
          pendingVerifications: pendingVerifications || 0,
          totalRecords: totalRecords,
          activeChats: activeChats,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast({
          title: "Error fetching dashboard data",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        })
      }
    }

    fetchDashboardData()

    // Cleanup function to set isOnline to false when the component unmounts
    return () => {
      async function setOffline() {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { error } = await supabase
            .from("userss")
            .update({ isOnline: false })
            .eq("uid", user.id)
            .eq("role", "admin")

          if (error) {
            console.error("Error setting user offline:", error)
          }
        }
      }
      setOffline()
    }
  }, [toast])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Welcome, {adminName || "Admin"}</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Total registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">Account requests awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">Total users and pending requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChats}</div>
            <p className="text-xs text-muted-foreground">Ongoing chat sessions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

