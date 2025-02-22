"use client"
import { useState, useRef, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, Upload, Download, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface ImportedUser {
  "First Name": string
  "Middle Name": string
  "Last Name": string
  "Date of Birth": string
  Gender: string
  "Phone Number": string
}

interface SupabaseUser {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  phone: string
  role: string
  created_at: string
  img_url: string | null
  uid: string | null
  fcm_token: string | null
  email: string | null
  status: string
}

export default function DataManagement() {
  const [records, setRecords] = useState<ImportedUser[]>([])
  const [importedData, setImportedData] = useState<ImportedUser[]>([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [existingUsers, setExistingUsers] = useState<SupabaseUser[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const formatDateForSupabase = (dateStr: string): string => {
    try {
      // Handle different possible date formats
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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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
            Gender: row["Gender"],
            "Phone Number": formatPhoneNumber(row["Phone Number"]),
          }
        })

        console.log("Processed data:", processedData)

        setImportedData(processedData)

        const hasExistingUsers = await checkExistingUsers(processedData)
        if (hasExistingUsers) {
          setIsConfirmModalOpen(true)
        } else {
          setIsImportModalOpen(true)
        }
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

  const checkExistingUsers = async (importedUsers: ImportedUser[]) => {
    try {
      const existingUsersData: SupabaseUser[] = []

      for (const user of importedUsers) {
        try {
          const formattedDate = formatDateForSupabase(user["Date of Birth"])
          console.log("Checking user:", user["First Name"], "with date:", formattedDate)

          const { data, error, status } = await supabase
            .from("userss")
            .select("*")
            .eq("first_name", user["First Name"])
            .eq("last_name", user["Last Name"])
            .eq("date_of_birth", formattedDate)

          if (error) throw error

          if (data && data.length > 0) {
            existingUsersData.push(...data)
          }
        } catch (error) {
          console.error("Error checking user:", user, error)
          throw error
        }
      }

      setExistingUsers(existingUsersData)
      return existingUsersData.length > 0
    } catch (error) {
      console.error("Error checking existing users:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred while checking for existing users.",
        variant: "destructive",
      })
      return false
    }
  }

  const handleImport = async (shouldUpdate = false) => {
    try {
      // First, let's get the maximum existing ID
      const { data: maxIdData, error: maxIdError } = await supabase
        .from("userss")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)

      if (maxIdError) {
        console.error("Error fetching max ID:", maxIdError)
        throw new Error(`Failed to fetch max ID: ${maxIdError.message}`)
      }

      let nextId = maxIdData && maxIdData.length > 0 ? Number.parseInt(maxIdData[0].id) + 1 : 1

      for (const user of importedData) {
        try {
          const newUser: Partial<SupabaseUser> = {
            id: nextId.toString(), // Use the next available ID
            first_name: user["First Name"],
            middle_name: user["Middle Name"] || null,
            last_name: user["Last Name"],
            date_of_birth: formatDateForSupabase(user["Date of Birth"]),
            gender: user["Gender"],
            phone: formatPhoneNumber(user["Phone Number"]), // Apply formatPhoneNumber here
            role: "patient", // Default role
            created_at: new Date().toISOString(),
            img_url: null,
            uid: null,
            fcm_token: null,
            email: null,
            status: "active",
          }

          if (shouldUpdate) {
            const existingUser = existingUsers.find(
              (eu) =>
                eu.first_name === user["First Name"] &&
                eu.last_name === user["Last Name"] &&
                eu.date_of_birth === formatDateForSupabase(user["Date of Birth"]),
            )

            if (existingUser) {
              const { data, error } = await supabase.from("userss").update(newUser).eq("id", existingUser.id).select()

              if (error) {
                throw new Error(`Failed to update user: ${error.message}`)
              }
              console.log("Updated user:", data)
            } else {
              console.warn("User not found for update:", user)
            }
          } else {
            const { data, error } = await supabase.from("userss").insert([newUser]).select()

            if (error) {
              throw new Error(`Failed to insert user: ${error.message}`)
            }
            console.log("Inserted user:", data)
            nextId++ // Increment the ID for the next user
          }
        } catch (userError) {
          console.error(`Error processing user ${user["First Name"]} ${user["Last Name"]}:`, userError)
          toast({
            title: "Error",
            description: `Failed to ${shouldUpdate ? "update" : "import"} user ${user["First Name"]} ${user["Last Name"]}: ${userError instanceof Error ? userError.message : "Unknown error occurred"}`,
            variant: "destructive",
          })
        }
      }

      toast({
        title: "Success",
        description: `Successfully ${shouldUpdate ? "updated" : "imported"} users.`,
      })

      setImportedData([])
      setIsImportModalOpen(false)
      setIsConfirmModalOpen(false)
    } catch (error) {
      console.error("Error importing users:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was an error processing the import.",
        variant: "destructive",
      })
    }
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(records)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    XLSX.writeFile(wb, "exported_data.xlsx")
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Management</h1>
        <div className="space-x-2">
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import Data
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Input placeholder="Search records..." className="max-w-sm" />
        <Button variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Middle Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Phone Number</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={index}>
              <TableCell>{record["First Name"]}</TableCell>
              <TableCell>{record["Middle Name"]}</TableCell>
              <TableCell>{record["Last Name"]}</TableCell>
              <TableCell>{record["Date of Birth"]}</TableCell>
              <TableCell>{record["Gender"]}</TableCell>
              <TableCell>{formatPhoneNumber(record["Phone Number"])}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Preview Modal */}
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
                      <TableCell>{formatPhoneNumber(row["Phone Number"])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleImport(false)}>Import New Users</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Existing Users */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Existing Users Found
            </DialogTitle>
            <DialogDescription>
              Some users in your import file already exist in the database. Would you like to update their information
              or create new entries?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmModalOpen(false)
                setIsImportModalOpen(true)
              }}
            >
              Create New
            </Button>
            <Button onClick={() => handleImport(true)}>Update Existing</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

