"use client"

import { TableHeader } from "@/components/ui/table"
import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
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
  isOnline?: boolean
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
}

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("admin")
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [importedData, setImportedData] = useState<ImportedUser[]>([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        console.log("Raw imported data:", jsonData)

        const processedData = jsonData.map((row) => {
          let dateOfBirth = row["Date of Birth"]

          // Handle Excel serial date
          if (typeof dateOfBirth === "number") {
            dateOfBirth = formatExcelDate(dateOfBirth)
          }

          return {
            "First Name": row["First Name"],
            "Middle Name": row["Middle Name"] || "",
            "Last Name": row["Last Name"],
            "Date of Birth": dateOfBirth,
            Gender: formatGender(row["Gender"]),
            Role: row["Role"], // Keep original capitalization
            "Phone Number": formatPhoneNumber(row["Phone Number"]),
          }
        })

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

  const handleImport = async () => {
    try {
      for (const user of importedData) {
        const { data, error } = await supabase.from("userss").insert({
          first_name: user["First Name"],
          middle_name: user["Middle Name"] || null,
          last_name: user["Last Name"],
          date_of_birth: formatDateForSupabase(user["Date of Birth"]),
          gender: user["Gender"],
          role: user["Role"].toLowerCase(), // Convert to lowercase only when inserting into Supabase
          phone: user["Phone Number"],
          status: "active",
          created_at: new Date().toISOString(),
        })

        if (error) {
          console.error("Supabase error:", error)
          throw new Error(`Supabase error: ${error.message}`)
        }
      }

      toast({
        title: "Success",
        description: "Users imported successfully.",
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
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
        </div>
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
                  {activeTab !== "admin" && <TableHead>Profile</TableHead>}
                  <TableHead>First Name</TableHead>
                  <TableHead>Middle Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>{activeTab === "admin" ? "Email" : "Phone"}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  {activeTab !== "admin" && <TableHead>Online</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "admin" ? 10 : 12} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={activeTab === "admin" ? 10 : 12}
                      className="h-24 text-center text-muted-foreground"
                    >
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
                      {activeTab !== "admin" && <TableCell>{user.isOnline ? "Yes" : "No"}</TableCell>}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>Review the data before importing</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="max-h-96 overflow-y-auto">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row["First Name"]}</TableCell>
                      <TableCell>{row["Middle Name"]}</TableCell>
                      <TableCell>{row["Last Name"]}</TableCell>
                      <TableCell>{row["Date of Birth"]}</TableCell>
                      <TableCell>{row["Gender"]}</TableCell>
                      <TableCell>{row["Role"]}</TableCell>
                      <TableCell>{row["Phone Number"]}</TableCell>
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

