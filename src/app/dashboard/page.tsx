"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Database, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format, subDays } from "date-fns"

interface DashboardStats {
  totalUsers: number
  pendingVerifications: number
  totalRecords: number
  activeUsers: number
}

interface UserGrowthData {
  date: string
  count: number
}

export default function Dashboard() {
  const [adminName, setAdminName] = useState<string>("")
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingVerifications: 0,
    totalRecords: 0,
    activeUsers: 0,
  })
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([])
  const { toast } = useToast()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) throw new Error("No authenticated user found")

        // Fetch admin user data
        const { data: userData, error: userError } = await supabase
          .from("userss")
          .select("first_name, middle_name, last_name")
          .eq("uid", user.id)
          .eq("role", "admin")
          .single()

        if (userError) throw new Error("Failed to fetch user data")
        if (userData) {
          const fullName = [userData.first_name, userData.middle_name, userData.last_name].filter(Boolean).join(" ")
          setAdminName(fullName)
        } else {
          throw new Error("No admin user found")
        }

        // Fetch current stats
        const [currentTotalUsers, currentPendingVerifications, currentActiveUsers] = await Promise.all([
          supabase.from("userss").select("*", { count: "exact" }),
          supabase.from("request_acc").select("*", { count: "exact" }),
          supabase.from("userss").select("*", { count: "exact" }).eq("isUserOnline", "yes").neq("role", "admin"),
        ])

        // Calculate current stats
        const totalUsers = currentTotalUsers.count || 0
        const pendingVerifications = currentPendingVerifications.count || 0
        const activeUsers = currentActiveUsers.count || 0
        const totalRecords = totalUsers + pendingVerifications

        setStats({
          totalUsers,
          pendingVerifications,
          totalRecords,
          activeUsers,
        })

        // Fetch user growth data (last 7 days including today)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Start of today
        const sevenDaysAgo = subDays(today, 6) // 7 days ago including today

        const { data: growthData, error: growthError } = await supabase
          .from("userss")
          .select("created_at")
          .gte("created_at", sevenDaysAgo.toISOString())
          .lte("created_at", new Date().toISOString()) // Include all of today
          .order("created_at", { ascending: true })

        if (growthError) throw growthError

        // Prepare an array with the last 7 days including today
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(today, 6 - i) // Count backwards from today
          return format(date, "yyyy-MM-dd")
        })

        // Count users for each day
        const growthByDay = growthData.reduce(
          (acc, { created_at }) => {
            const date = format(new Date(created_at), "yyyy-MM-dd")
            acc[date] = (acc[date] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

        // Create the final user growth data, including days with zero new users
        const userGrowthData = last7Days.map((date) => ({
          date: format(new Date(date), "MM/dd"), // Format date as MM/dd for display
          count: growthByDay[date] || 0,
        }))

        setUserGrowth(userGrowthData)
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
  }, [toast])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Welcome back, {adminName || "Admin"}</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          description="Registered users"
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Pending Verifications"
          value={stats.pendingVerifications}
          description="Account requests"
          icon={<UserCheck className="h-6 w-6" />}
        />
        <StatsCard
          title="Total Records"
          value={stats.totalRecords}
          description="Users and requests"
          icon={<Database className="h-6 w-6" />}
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers}
          description="Currently online (non-admin)"
          icon={<Activity className="h-6 w-6" />}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Growth (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
}

function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

