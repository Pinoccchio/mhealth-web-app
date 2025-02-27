"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  MoreHorizontal,
  Loader2,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  MessageSquare,
  Upload,
  Download,
  ArrowUpDown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import * as XLSX from "xlsx"

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
  status: string
  isUserOnline: "yes" | "no"
  img_url?: string
}

interface ImportedUser {
  "First Name": string
  "Middle Name": string
  "Last Name": string
  "Date of Birth": string
  Gender: string
  Role: string
  "Phone Number": string
  existingUser?: User | null
  matchReason?: string
}

type SortColumn = "first_name" | "last_name" | "date_of_birth" | "role" | "status" | "created_at"
type SortDirection = "asc" | "desc"

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("admin")
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [importedData, setImportedData] = useState<ImportedUser[]>([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [sortColumn, setSortColumn] = useState<SortColumn>("first_name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setFullScreenImage(null)
    }
  }, [])

  useEffect(() => {
    if (fullScreenImage) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [fullScreenImage, handleKeyDown])

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      let query = supabase.from("userss").select("*")

      if (activeTab === "admin") {
        query = query.eq("role", "admin")
      } else if (activeTab === "health-workers") {
        query = query.in("role", ["doctor", "nurse", "midwife", "bhw"])
      } else if (activeTab === "patient") {
        query = query.eq("role", "patient")
      }

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
      toast({
        title: "Error fetching users",
        description: "There was a problem retrieving user data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const toggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"
    try {
      const { error } = await supabase.from("userss").update({ status: newStatus }).eq("id", userId)

      if (error) throw error

      setUsers(users.map((user) => (user.id === userId ? { ...user, status: newStatus } : user)))
      toast({
        title: "User status updated",
        description: `User has been ${newStatus === "active" ? "activated" : "deactivated"}.`,
      })
    } catch (error) {
      console.error("Error updating user status:", error)
      toast({
        title: "Error updating user status",
        description: "There was a problem updating the user status.",
        variant: "destructive",
      })
    }
  }

  const deleteUser = async (userId: number) => {
    try {
      const { error } = await supabase.from("userss").delete().eq("id", userId)

      if (error) throw error

      setUsers(users.filter((user) => user.id !== userId))
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error deleting user",
        description: "There was a problem deleting the user.",
        variant: "destructive",
      })
    }
  }

  const sendSMS = async (userId: number) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) throw new Error("User not found")

      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          phone: user.phone,
          firstName: user.first_name,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "SMS Sent",
          description: "The user has been notified about their account creation.",
        })
      } else {
        throw new Error(data.error || "Failed to send SMS")
      }
    } catch (error) {
      console.error("Error sending SMS:", error)
      toast({
        title: "Error sending SMS",
        description: "There was a problem sending the SMS notification.",
        variant: "destructive",
      })
    }
  }

  const formatDateForSupabase = (dateStr: string): string => {
    try {
      if (!dateStr) throw new Error("Invalid date")

      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr
      }

      // If it's in DD/MM/YYYY format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split("/")
        if (!day || !month || !year) throw new Error("Invalid date format")
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }

      // If it's a number (Excel serial date)
      if (!isNaN(Number(dateStr))) {
        const date = new Date((Number(dateStr) - 25569) * 86400 * 1000)
        return date.toISOString().split("T")[0]
      }

      // Try parsing the date using the Date object
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) throw new Error("Invalid date")

      return date.toISOString().split("T")[0]
    } catch (error) {
      console.error("Error formatting date:", dateStr, error)
      throw new Error(`Invalid date format: ${dateStr}`)
    }
  }

  const formatExcelDate = (serialDate: number): string => {
    try {
      const date = new Date((serialDate - 25569) * 86400 * 1000)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${day}/${month}/${year}`
    } catch (error) {
      console.error("Error formatting Excel date:", serialDate, error)
      throw new Error(`Invalid Excel date: ${serialDate}`)
    }
  }

  const formatDateForDisplay = (dateStr: string): string => {
    // Convert YYYY-MM-DD to DD/MM/YYYY for display
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  const formatPhoneNumber = (phone: string | number): string => {
    const phoneStr = phone.toString().replace(/[^\d]/g, "")
    return phoneStr.startsWith("63") ? `+${phoneStr}` : `+63${phoneStr}`
  }

  const formatGender = (gender: string): string => {
    const normalizedGender = gender.trim().toLowerCase()
    if (normalizedGender === "male" || normalizedGender === "m") {
      return "M"
    } else if (normalizedGender === "female" || normalizedGender === "f") {
      return "F"
    } else {
      return gender // Return original value if it doesn't match known formats
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

        console.log("Raw imported data:", jsonData)

        const processedData: ImportedUser[] = []

        for (const row of jsonData) {
          let dateOfBirth = row["Date of Birth"]

          // Handle Excel serial date
          if (typeof dateOfBirth === "number") {
            dateOfBirth = formatExcelDate(dateOfBirth)
          }

          const formattedDateOfBirth = formatDateForSupabase(dateOfBirth as string)

          const importedUser: ImportedUser = {
            "First Name": row["First Name"] as string,
            "Middle Name": (row["Middle Name"] as string) || "",
            "Last Name": row["Last Name"] as string,
            "Date of Birth": dateOfBirth as string,
            Gender: formatGender(row["Gender"] as string),
            Role: row["Role"] as string,
            "Phone Number": formatPhoneNumber(row["Phone Number"] as string),
          }

          // Check if user already exists using multiple criteria
          const { data: existingUsers, error: fetchError } = await supabase
            .from("userss")
            .select("*")
            .or(
              `phone.eq.${importedUser["Phone Number"]},date_of_birth.eq.${formattedDateOfBirth},and(first_name.eq.${importedUser["First Name"]},last_name.eq.${importedUser["Last Name"]})`,
            )

          if (fetchError) {
            console.error("Error fetching existing users:", fetchError)
            throw new Error(`Error fetching existing users: ${fetchError.message}`)
          }

          if (existingUsers && existingUsers.length > 0) {
            importedUser.existingUser = existingUsers[0]
            importedUser.matchReason = getMatchReason(importedUser, existingUsers[0])
          }

          processedData.push(importedUser)
        }

        console.log("Processed data:", processedData)

        setImportedData(processedData)
        setIsImportModalOpen(true)
      } catch (error) {
        console.error("Error processing file:", error)
        toast({
          title: "Error",
          description: "Failed to process the uploaded file. Please check the file format and try again.",
          variant: "destructive",
        })
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // Helper function to determine the reason for the match
  const getMatchReason = (importedUser: ImportedUser, existingUser: User): string => {
    if (importedUser["Phone Number"] === existingUser.phone) {
      return "Phone number match"
    } else if (importedUser["Date of Birth"] === formatDateForDisplay(existingUser.date_of_birth)) {
      return "Date of birth match"
    } else {
      return "Name match"
    }
  }

  const handleImport = async () => {
    try {
      const newUsers = []
      const updatedUsers = []

      // Get the maximum existing ID first
      const { data: maxIdData, error: maxIdError } = await supabase
        .from("userss")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)

      if (maxIdError) {
        console.error("Error getting max ID:", maxIdError)
        throw new Error(`Error getting max ID: ${maxIdError.message}`)
      }

      let nextId = maxIdData && maxIdData.length > 0 ? Number(maxIdData[0].id) + 1 : 1

      for (const user of importedData) {
        if (user.existingUser) {
          // User exists, update the record
          const { data: updatedUser, error: updateError } = await supabase
            .from("userss")
            .update({
              first_name: user["First Name"],
              middle_name: user["Middle Name"] || null,
              last_name: user["Last Name"],
              gender: user["Gender"],
              role: user["Role"].toLowerCase(),
              phone: user["Phone Number"],
            })
            .eq("id", user.existingUser.id)
            .select()

          if (updateError) {
            console.error("Error updating user:", updateError)
            throw new Error(`Error updating user: ${updateError.message}`)
          }

          updatedUsers.push(updatedUser)
        } else {
          // User doesn't exist, create a new record with incremented ID
          const { data: newUser, error: insertError } = await supabase
            .from("userss")
            .insert({
              id: nextId.toString(), // Convert to string since ID is stored as string
              first_name: user["First Name"],
              middle_name: user["Middle Name"] || null,
              last_name: user["Last Name"],
              date_of_birth: formatDateForSupabase(user["Date of Birth"]),
              gender: user["Gender"],
              role: user["Role"].toLowerCase(),
              phone: user["Phone Number"],
              status: "active",
              created_at: new Date().toISOString(),
              isUserOnline: "no",
            })
            .select()

          if (insertError) {
            console.error("Error inserting new user:", insertError)
            throw new Error(`Error inserting new user: ${insertError.message}`)
          }

          newUsers.push(newUser)
          nextId++ // Increment ID for next new user

          // Send SMS notification to the new user
          try {
            const response = await fetch("/api/send-sms", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phone: user["Phone Number"],
                firstName: user["First Name"],
              }),
            })

            const smsResult = await response.json()

            if (!response.ok) {
              console.warn("SMS notification failed for user:", user["First Name"], smsResult)
            } else {
              console.log("SMS notification sent successfully to:", user["First Name"])
            }
          } catch (smsError) {
            console.warn("Error sending SMS notification to user:", user["First Name"], smsError)
          }
        }
      }

      toast({
        title: "Import Successful",
        description: `${newUsers.length} new users created, ${updatedUsers.length} users updated.`,
      })

      setIsImportModalOpen(false)
      fetchUsers()
    } catch (error) {
      console.error("Error importing users:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while importing users.",
        variant: "destructive",
      })
    }
  }

  const sortUsers = (users: User[]): User[] => {
    return [...users].sort((a, b) => {
      // Handle date sorting
      if (sortColumn === "created_at" || sortColumn === "date_of_birth") {
        const dateA = new Date(a[sortColumn]).getTime()
        const dateB = new Date(b[sortColumn]).getTime()
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      }

      // Handle status sorting
      if (sortColumn === "status") {
        if (sortDirection === "asc") {
          return a.status === "active" ? -1 : 1
        }
        return a.status === "active" ? 1 : -1
      }

      // Handle string sorting with null/undefined check
      const valueA = (a[sortColumn] || "").toLowerCase()
      const valueB = (b[sortColumn] || "").toLowerCase()

      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }

  const sortedUsers = sortUsers(users)

  const handleExport = () => {
    try {
      let filteredUsers = users
      if (activeTab === "admin") {
        filteredUsers = users.filter((user) => user.role === "admin")
      } else if (activeTab === "health-workers") {
        filteredUsers = users.filter((user) => ["doctor", "nurse", "midwife", "bhw"].includes(user.role))
      } else if (activeTab === "patient") {
        filteredUsers = users.filter((user) => user.role === "patient")
      }

      const exportData = filteredUsers.map((user) => ({
        "First Name": user.first_name,
        "Middle Name": user.middle_name,
        "Last Name": user.last_name,
        "Date of Birth": formatDateForDisplay(user.date_of_birth),
        Gender: user.gender,
        Phone: user.phone,
        Email: user.email,
        Role: user.role,
        Status: user.status,
        "Created At": format(new Date(user.created_at), "PPP"),
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Users")
      XLSX.writeFile(wb, `${activeTab}_users.xlsx`)

      toast({
        title: "Export Successful",
        description: `${exportData.length} users exported to Excel.`,
      })
    } catch (error) {
      console.error("Error exporting users:", error)
      toast({
        title: "Export Failed",
        description: "There was an error exporting users to Excel.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="space-x-2">
          <Button asChild>
            <Link href="/dashboard/users/add">
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Link>
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import Users
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Users
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Input placeholder="Search users..." className="max-w-sm" value={searchQuery} onChange={handleSearch} />
        <Button variant="outline" onClick={() => fetchUsers()}>
          <Search className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort by
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("first_name")
                setSortDirection("asc")
              }}
            >
              First Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("first_name")
                setSortDirection("desc")
              }}
            >
              First Name (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("last_name")
                setSortDirection("asc")
              }}
            >
              Last Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("last_name")
                setSortDirection("desc")
              }}
            >
              Last Name (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("created_at")
                setSortDirection("desc")
              }}
            >
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("created_at")
                setSortDirection("asc")
              }}
            >
              Oldest First
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("role")
                setSortDirection("asc")
              }}
            >
              Role (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("status")
                setSortDirection("asc")
              }}
            >
              Status (Active First)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortColumn("status")
                setSortDirection("desc")
              }}
            >
              Status (Inactive First)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                  {activeTab !== "admin" && <TableHead>Profile</TableHead>}
                  {[
                    { key: "first_name", label: "First Name" },
                    { key: "middle_name", label: "Middle Name" },
                    { key: "last_name", label: "Last Name" },
                    { key: "date_of_birth", label: "Date of Birth" },
                    { key: "gender", label: "Gender" },
                    {
                      key: activeTab === "admin" ? "email" : "phone",
                      label: activeTab === "admin" ? "Email" : "Phone",
                    },
                    { key: "role", label: "Role" },
                    { key: "status", label: "Status" },
                    { key: "created_at", label: "Created At" },
                    { key: "isUserOnline", label: "Online Status" },
                  ].map(({ key, label }) => (
                    <TableHead key={key}>{label}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      {activeTab === "admin"
                        ? "No admin users found. Create an admin user to get started."
                        : activeTab === "health-workers"
                          ? "No health workers found. Add health workers to manage your staff."
                          : "No patients found. Patient records will appear here."}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user) => (
                    <TableRow key={user.id}>
                      {activeTab !== "admin" && (
                        <TableCell>
                          <div
                            className="cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setFullScreenImage(user.img_url || null)}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.img_url || ""} alt={`${user.first_name} ${user.last_name}`} />
                              <AvatarFallback>
                                {(user.first_name?.[0] || "") + (user.last_name?.[0] || "").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>{user.first_name}</TableCell>
                      <TableCell>{user.middle_name}</TableCell>
                      <TableCell>{user.last_name}</TableCell>
                      <TableCell>{formatDateForDisplay(user.date_of_birth)}</TableCell>
                      <TableCell>{user.gender}</TableCell>
                      <TableCell>{user.role === "admin" ? user.email : user.phone}</TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === "active" ? "default" : "secondary"}
                          className={user.status === "active" ? "bg-green-500" : "bg-red-500"}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(user.created_at), "PPP")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isUserOnline === "yes" ? "default" : "secondary"}
                          className={user.isUserOnline === "yes" ? "bg-green-500" : "bg-gray-500"}
                        >
                          {user.isUserOnline === "yes" ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleUserStatus(user.id, user.status)}>
                              {user.status === "active" ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendSMS(user.id)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Send SMS
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user account and
                                    remove their data from our servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteUser(user.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {fullScreenImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="relative max-w-4xl max-h-4xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation()
                setFullScreenImage(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={fullScreenImage || "/placeholder.svg"}
              alt="Full size profile"
              className="max-h-[90vh] max-w-full rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>Review the data before importing. Existing users are highlighted.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Middle Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedData.map((row, index) => (
                    <TableRow key={index} className={row.existingUser ? "bg-yellow-50" : ""}>
                      <TableCell>
                        {row.existingUser && (
                          <div className="text-xs text-gray-500 mb-1">Current: {row.existingUser.first_name}</div>
                        )}
                        <div
                          className={
                            row.existingUser && row["First Name"] !== row.existingUser.first_name
                              ? "font-bold text-blue-600"
                              : ""
                          }
                        >
                          {row["First Name"]}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.existingUser && (
                          <div className="text-xs text-gray-500 mb-1">Current: {row.existingUser.middle_name}</div>
                        )}
                        <div
                          className={
                            row.existingUser && row["Middle Name"] !== row.existingUser.middle_name
                              ? "font-bold text-blue-600"
                              : ""
                          }
                        >
                          {row["Middle Name"]}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.existingUser && (
                          <div className="text-xs text-gray-500 mb-1">Current: {row.existingUser.last_name}</div>
                        )}
                        <div
                          className={
                            row.existingUser && row["Last Name"] !== row.existingUser.last_name
                              ? "font-bold text-blue-600"
                              : ""
                          }
                        >
                          {row["Last Name"]}
                        </div>
                      </TableCell>
                      <TableCell>{row["Date of Birth"]}</TableCell>
                      <TableCell>
                        {row.existingUser && (
                          <div className="text-xs text-gray-500 mb-1">Current: {row.existingUser.gender}</div>
                        )}
                        <div
                          className={
                            row.existingUser && row["Gender"] !== row.existingUser.gender
                              ? "font-bold text-blue-600"
                              : ""
                          }
                        >
                          {row["Gender"]}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.existingUser && (
                          <div className="text-xs text-gray-500 mb-1">Current: {row.existingUser.role}</div>
                        )}
                        <div
                          className={
                            row.existingUser && row["Role"].toLowerCase() !== row.existingUser.role
                              ? "font-bold text-blue-600"
                              : ""
                          }
                        >
                          {row["Role"]}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.existingUser && (
                          <div className="text-xs text-gray-500 mb-1">Current: {row.existingUser.phone}</div>
                        )}
                        <div
                          className={
                            row.existingUser && row["Phone Number"] !== row.existingUser.phone
                              ? "font-bold text-blue-600"
                              : ""
                          }
                        >
                          {row["Phone Number"]}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.existingUser ? (
                          <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                            Update
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500">
                            New
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.matchReason && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {row.matchReason}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport}>Import Users</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

