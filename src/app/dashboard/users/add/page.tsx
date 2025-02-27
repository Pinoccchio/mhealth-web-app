"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type AuthData = {
  user: {
    id?: string
  } | null
}

export default function AddUserPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const formDataState = {
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    role: "",
    email: "",
    password: "",
    confirm_password: "",
    status: "active",
    isUserOnline: "no",
  }
  const [formData, setFormData] = useState(formDataState)
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const formatPhoneNumber = (phone: string): string => {
    if (phone.startsWith("09")) {
      return "+63" + phone.slice(1)
    } else if (phone.startsWith("9")) {
      return "+63" + phone
    } else if (phone.startsWith("+63")) {
      return phone
    }
    // If the format is not recognized, return the original input
    return phone
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (formData.role === "admin" && formData.password !== formData.confirm_password) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      let authData: AuthData = { user: null }

      // Use Supabase auth for admin users only
      if (formData.role === "admin") {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })
        if (error) throw error
        authData = data
      }

      // Get the maximum existing ID
      const { data: maxIdData, error: maxIdError } = await supabase
        .from("userss")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)

      if (maxIdError) throw new Error(`Max ID Error: ${maxIdError.message}`)

      const maxId = maxIdData && maxIdData.length > 0 ? Number.parseInt(maxIdData[0].id) : 0
      const nextId = (maxId + 1).toString()

      // Format the phone number for non-admin users
      const formattedPhone = formData.role !== "admin" ? formatPhoneNumber(formData.phone) : null

      // Insert user data with proper field mapping
      const { error: insertError } = await supabase.from("userss").insert({
        id: nextId,
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        phone: formattedPhone,
        role: formData.role,
        created_at: new Date().toISOString(),
        img_url: null,
        uid: authData.user?.id,
        fcm_token: null,
        email: formData.role === "admin" ? formData.email : null,
        status: "active",
        isUserOnline: "no",
      })

      if (insertError) throw new Error(`Insert Error: ${insertError.message}`)

      // Send SMS notification for non-admin users
      if (formData.role !== "admin" && formattedPhone) {
        try {
          const smsResponse = await fetch("/api/send-sms", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone: formattedPhone,
              firstName: formData.first_name,
            }),
          })

          const smsResult = await smsResponse.json()

          if (!smsResponse.ok) {
            console.warn("SMS notification failed:", smsResult)
            // We don't throw an error here to avoid blocking the user creation flow
          } else {
            console.log("SMS notification sent successfully:", smsResult)
          }
        } catch (smsError) {
          console.warn("Error sending SMS notification:", smsError)
          // We don't throw an error here to avoid blocking the user creation flow
        }
      }

      toast({
        title: "User added successfully",
        description: "The user account has been created successfully.",
      })

      router.push("/dashboard/users")
    } catch (error) {
      console.error("Error details:", error)
      toast({
        title: "Error adding user",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/users" className="hover:text-foreground">
            User Management
          </Link>
          <span>/</span>
          <span className="text-foreground">Add New User</span>
        </nav>
      </div>

      <Card className="w-full">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Add New User</CardTitle>
          </div>
          <CardDescription className="text-base">
            Create a new user account. Admin accounts require login credentials, while other roles use phone numbers for
            identification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <div className="space-y-2 w-full">
              <Label htmlFor="role">Role</Label>
              <Select name="role" onValueChange={(value) => handleSelectChange("role", value)} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="midwife">Midwife</SelectItem>
                  <SelectItem value="bhw">BHW</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="space-y-2 w-full">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full"
                  required
                />
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 w-full">
              {formData.role === "admin" ? (
                <>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full"
                    required
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full"
                    placeholder="e.g., 09123456789"
                    required
                  />
                </>
              )}
            </div>

            {formData.role === "admin" && (
              <>
                <div className="space-y-2 w-full">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative w-full">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative w-full">
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      className="w-full pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="space-y-2 w-full">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className="w-full"
                  required
                />
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="gender">Gender</Label>
                <Select name="gender" onValueChange={(value) => handleSelectChange("gender", value)} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

