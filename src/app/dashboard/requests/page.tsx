"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, CheckCircle, XCircle, X } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface RequestAccount {
  id: number
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  phone: string
  id_photo_url: string | null
  created_at: string
  gender: string
  ocr_text: string
}

export default function PatientAccountRequests() {
  const [requests, setRequests] = useState<RequestAccount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "reject"; request: RequestAccount | null }>({
    type: "approve",
    request: null,
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      let query = supabase.from("request_acc").select("*")

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,middle_name.ilike.%${searchQuery}%`,
        )
      }

      const { data, error } = await query

      if (error) throw error

      setRequests(data || [])
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast({
        title: "Error fetching requests",
        description: "There was a problem retrieving account requests.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, toast])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleApprove = async (request: RequestAccount) => {
    try {
      // Ensure the request id is valid
      if (!request.id) {
        throw new Error("Invalid request ID")
      }

      // Get the maximum existing ID
      const { data: maxIdData, error: maxIdError } = await supabase
        .from("userss")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)

      if (maxIdError) {
        console.error("Max ID Error:", maxIdError)
        throw new Error(`Max ID Error: ${maxIdError.message}`)
      }

      const maxId = maxIdData && maxIdData.length > 0 ? Number.parseInt(maxIdData[0].id) : 0
      const nextId = (maxId + 1).toString()

      // Insert the approved request into the userss table
      const { data: userData, error: userError } = await supabase
        .from("userss")
        .insert({
          id: nextId,
          first_name: request.first_name,
          middle_name: request.middle_name || null,
          last_name: request.last_name,
          date_of_birth: request.date_of_birth,
          gender: request.gender,
          phone: request.phone,
          role: "patient",
          created_at: new Date().toISOString(),
          img_url: request.id_photo_url,
          uid: request.id.toString(), // Ensure this is not null
          fcm_token: null,
          email: null,
          status: "active",
        })
        .select()
        .single()

      if (userError) {
        console.error("User Insert Error:", userError)
        throw new Error(`User Insert Error: ${userError.message}`)
      }

      // Verify that the user was created with a valid uid
      if (!userData || !userData.uid) {
        throw new Error("Failed to create user with valid UID")
      }

      // Delete the request from the request_acc table
      const { error: deleteError } = await supabase.from("request_acc").delete().eq("id", request.id)

      if (deleteError) {
        console.error("Delete Request Error:", deleteError)
        throw new Error(`Delete Request Error: ${deleteError.message}`)
      }

      // Send SMS notification
      try {
        const response = await fetch("/api/send-sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: request.phone,
            firstName: request.first_name,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.warn("Failed to send SMS notification:", errorData)
        } else {
          console.log("SMS notification sent successfully")
        }
      } catch (smsError) {
        console.error("Error sending SMS notification:", smsError)
      }

      // Update the local state
      setRequests(requests.filter((r) => r.id !== request.id))

      toast({
        title: "Request Approved",
        description: `${request.first_name} ${request.last_name}'s account has been created.`,
      })
    } catch (error) {
      console.error("Error approving request:", error)
      toast({
        title: "Error approving request",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (requestId: number) => {
    try {
      // Delete the request from the request_acc table
      const { error } = await supabase.from("request_acc").delete().eq("id", requestId)

      if (error) throw error

      // Update the local state
      setRequests(requests.filter((request) => request.id !== requestId))

      toast({
        title: "Request Rejected",
        description: "The account request has been rejected and removed.",
      })
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({
        title: "Error rejecting request",
        description: "There was a problem rejecting the account request.",
        variant: "destructive",
      })
    }
  }

  const openConfirmDialog = (type: "approve" | "reject", request: RequestAccount) => {
    setConfirmAction({ type, request })
    setShowConfirmDialog(true)
  }

  const handleConfirmAction = () => {
    if (confirmAction.request) {
      if (confirmAction.type === "approve") {
        handleApprove(confirmAction.request)
      } else {
        handleReject(confirmAction.request.id)
      }
    }
    setShowConfirmDialog(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patient Account Requests</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Input placeholder="Search requests..." className="max-w-sm" value={searchQuery} onChange={handleSearch} />
        <Button variant="outline" onClick={fetchRequests}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Image</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Middle Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No account requests found.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div
                      className="cursor-pointer transition-transform hover:scale-105"
                      onClick={() => setFullScreenImage(request.id_photo_url)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={request.id_photo_url || ""}
                          alt={`${request.first_name} ${request.last_name}`}
                        />
                        <AvatarFallback>
                          {(request.first_name?.[0] || "") + (request.last_name?.[0] || "").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </TableCell>
                  <TableCell>{request.first_name}</TableCell>
                  <TableCell>{request.middle_name || "-"}</TableCell>
                  <TableCell>{request.last_name}</TableCell>
                  <TableCell>{request.date_of_birth}</TableCell>
                  <TableCell>{request.gender}</TableCell>
                  <TableCell>{request.phone}</TableCell>
                  <TableCell>{format(new Date(request.created_at), "PPP")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2"
                      onClick={() => openConfirmDialog("approve", request)}
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openConfirmDialog("reject", request)}>
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === "approve" ? "Approve Request" : "Reject Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === "approve"
                ? `Are you sure you want to approve this user? This will create their account.`
                : `Are you sure you want to reject this request? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={cn(
                confirmAction.type === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700",
                "text-white",
              )}
            >
              {confirmAction.type === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              alt="Full size ID"
              className="max-h-[90vh] max-w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}

