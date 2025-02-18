"use client"

import { TableHeader } from "@/components/ui/table"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreHorizontal, Loader2, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface User {
  id: number
  first_name: string
  middle_name: string
  last_name: string
  date_of_birth: string
  gender: string
  phone: string
  email: string
  role: string
  created_at: string
  isOnline: boolean
  isActive: boolean
}

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("admin")
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      let query = supabase.from("userss").select("*")

      // Filter by role based on active tab
      if (activeTab === "admin") {
        query = query.eq("role", "admin")
      } else if (activeTab === "health-workers") {
        query = query.in("role", ["doctor", "nurse", "midwife", "bhw"])
      } else if (activeTab === "patient") {
        query = query.eq("role", "patient")
      }

      // Add search filter if query exists
      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,middle_name.ilike.%${searchQuery}%`,
        )
      }

      const { data, error } = await query

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [activeTab, searchQuery])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button asChild>
          <Link href="/dashboard/users/add">
            <UserPlus className="mr-2 h-4 w-4" /> Add User
          </Link>
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <Input placeholder="Search users..." className="max-w-sm" value={searchQuery} onChange={handleSearch} />
        <Button variant="outline" onClick={() => fetchUsers()}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="admin">Admin Users</TabsTrigger>
          <TabsTrigger value="health-workers">Health Workers</TabsTrigger>
          <TabsTrigger value="patient">Patient Users</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Middle Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>{activeTab === "admin" ? "Email" : "Phone"}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      {activeTab === "admin"
                        ? "No admin users found. Create an admin user to get started."
                        : activeTab === "health-workers"
                          ? "No health workers found. Add health workers to manage your staff."
                          : "No patients found. Patient records will appear here."}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.first_name}</TableCell>
                      <TableCell>{user.middle_name}</TableCell>
                      <TableCell>{user.last_name}</TableCell>
                      <TableCell>{user.date_of_birth}</TableCell>
                      <TableCell>{user.gender}</TableCell>
                      <TableCell>{user.role === "admin" ? user.email : user.phone}</TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell>{user.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell>{user.isOnline ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/users/${user.id}`}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

