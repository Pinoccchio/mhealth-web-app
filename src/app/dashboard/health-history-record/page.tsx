"use client"
import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Upload, Download } from "lucide-react"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface HealthHistoryRecord {
  id?: string
  user_id: string
  first_name: string
  last_name: string
  allergy: string
  immunizations: string
  surgical_history: string
  neurologic: string
  family_history: string
  family_history_other: string
  past_history: string
  past_history_other: string
  lab_requests: string
  created_at: string
  menstrual_history: string
  pregnancy_history: string
  general_survey: string
  skin_condition: string
  heent_condition: string
  chest_condition: string
  heart_condition: string
  abdomen_condition: string
  extremities_condition: string
  smoking_history: string
  drinking_history: string
  exercise_history: string
  social_history_other: string
  gravida: string
  para: string
  pe_findings: string
  term: string
  premature: string
  abortion: string
  live_birth: string
}

interface ImportedDataRow extends Partial<Omit<HealthHistoryRecord, "user_id">> {
  user_id: string
  existingRecord?: HealthHistoryRecord
  matchReason?: string
}

export default function HealthHistoryRecord() {
  const [healthRecords, setHealthRecords] = useState<HealthHistoryRecord[]>([])
  const [importedData, setImportedData] = useState<ImportedDataRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchHealthRecords()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHealthRecords = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("health_history")
        .select(`
          *,
          userss:user_id (
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedData =
        data?.map((record) => ({
          ...record,
          first_name: record.userss?.first_name || "",
          last_name: record.userss?.last_name || "",
        })) || []

      setHealthRecords(formattedData)
    } catch (error) {
      console.error("Error fetching health records:", error)
      toast({
        title: "Error",
        description: "Failed to fetch health records. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const convertTimeToTimestamp = (timeStr: string): string => {
    try {
      // If it's already a valid ISO string, return it
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(timeStr)) {
        return timeStr
      }

      // If it's in MM:SS.F format
      if (/^\d{2}:\d{2}\.\d{1,3}$/.test(timeStr)) {
        const [minutesPart, secondsPart] = timeStr.split(":")
        const [seconds, fraction] = secondsPart.split(".")

        const minutes = Number.parseInt(minutesPart)
        const secs = Number.parseInt(seconds)
        const milliseconds = Number.parseInt(fraction.padEnd(3, "0"))

        const now = new Date()
        const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, minutes, secs, milliseconds)

        return timestamp.toISOString()
      }

      throw new Error(`Invalid time format: ${timeStr}`)
    } catch (error) {
      console.error("Error converting time:", error)
      throw new Error(`Failed to convert time: ${timeStr}`)
    }
  }

  const checkExistingRecords = async (importedRecords: ImportedDataRow[]) => {
    try {
      const updatedRecords = [...importedRecords]

      for (const record of updatedRecords) {
        try {
          if (!record.user_id) {
            console.warn("Skipping record with no user_id:", record)
            continue
          }

          const { data: existingData, error } = await supabase
            .from("health_history")
            .select("*")
            .eq("user_id", record.user_id)

          if (error) {
            console.error("Error checking existing record:", {
              error,
              userId: record.user_id,
            })
            throw new Error(`Failed to check existing records: ${error.message}`)
          }

          if (existingData && existingData.length > 0) {
            if (record.created_at) {
              try {
                const timestamp = convertTimeToTimestamp(record.created_at)
                record.created_at = timestamp

                const exactMatch = existingData.find(
                  (existing) =>
                    Math.abs(new Date(existing.created_at).getTime() - new Date(timestamp).getTime()) < 1000,
                )

                if (exactMatch) {
                  record.existingRecord = exactMatch
                  record.matchReason = "Exact match (user_id and timestamp)"
                  continue
                }
              } catch (e) {
                console.error("Error parsing time:", {
                  error: e,
                  timestamp: record.created_at,
                  userId: record.user_id,
                })
                record.created_at = new Date().toISOString()
              }
            } else {
              record.created_at = new Date().toISOString()
            }

            const mostRecent = existingData.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )[0]

            record.existingRecord = mostRecent
            record.matchReason = "Most recent record for user"
          }
        } catch (recordError) {
          console.error("Error processing record in checkExistingRecords:", {
            error: recordError,
            record: record,
            userId: record.user_id,
          })
          throw recordError
        }
      }

      return updatedRecords
    } catch (error) {
      console.error("Error in checkExistingRecords:", error)
      throw error
    }
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        let jsonData: Record<string, unknown>[]

        if (file.name.endsWith(".csv")) {
          const csvData = e.target?.result as string
          const workbook = XLSX.read(csvData, { type: "string" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" })
        } else {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" })
        }

        console.log("Raw imported data:", jsonData)

        const processedData = jsonData
          .map((row) => {
            const userId = Object.entries(row).find(
              ([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === "userid",
            )?.[1]

            if (typeof userId !== "string" || userId === "") {
              console.warn("Invalid or missing user_id:", row)
              return null // Skip this row
            }

            const processedRow: ImportedDataRow = {
              user_id: userId,
              allergy: findFieldValue(row, "allergy"),
              immunizations: findFieldValue(row, "immunizations"),
              surgical_history: findFieldValue(row, "surgical_history"),
              neurologic: findFieldValue(row, "neurologic"),
              family_history: findFieldValue(row, "family_history"),
              family_history_other: findFieldValue(row, "family_history_other"),
              past_history: findFieldValue(row, "past_history"),
              past_history_other: findFieldValue(row, "past_history_other"),
              lab_requests: findFieldValue(row, "lab_requests"),
              created_at: findFieldValue(row, "created_at"),
              menstrual_history: findFieldValue(row, "menstrual_history"),
              pregnancy_history: findFieldValue(row, "pregnancy_history"),
              general_survey: findFieldValue(row, "general_survey"),
              skin_condition: findFieldValue(row, "skin_condition"),
              heent_condition: findFieldValue(row, "heent_condition"),
              chest_condition: findFieldValue(row, "chest_condition"),
              heart_condition: findFieldValue(row, "heart_condition"),
              abdomen_condition: findFieldValue(row, "abdomen_condition"),
              extremities_condition: findFieldValue(row, "extremities_condition"),
              smoking_history: findFieldValue(row, "smoking_history"),
              drinking_history: findFieldValue(row, "drinking_history"),
              exercise_history: findFieldValue(row, "exercise_history"),
              social_history_other: findFieldValue(row, "social_history_other"),
              gravida: findFieldValue(row, "gravida"),
              para: findFieldValue(row, "para"),
              pe_findings: findFieldValue(row, "pe_findings"),
              term: findFieldValue(row, "term"),
              premature: findFieldValue(row, "premature"),
              abortion: findFieldValue(row, "abortion"),
              live_birth: findFieldValue(row, "live_birth"),
            }
            return processedRow
          })
          .filter((row): row is ImportedDataRow => row !== null)

        console.log("Processed data:", processedData)

        const recordsWithExisting = await checkExistingRecords(processedData)
        setImportedData(recordsWithExisting)
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

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  }

  const findFieldValue = (row: Record<string, unknown>, fieldName: string): string => {
    const normalizedFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "")
    const entry = Object.entries(row).find(
      ([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedFieldName,
    )
    return (entry?.[1] || "").toString()
  }

  const handleImport = async () => {
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    try {
      for (const record of importedData) {
        try {
          if (!record.user_id) {
            throw new Error(`Missing user_id for record`)
          }

          const created_at = record.created_at ? convertTimeToTimestamp(record.created_at) : new Date().toISOString()

          const dataToSave = {
            user_id: record.user_id,
            allergy: record.allergy || "",
            immunizations: record.immunizations || "",
            surgical_history: record.surgical_history || "",
            neurologic: record.neurologic || "",
            family_history: record.family_history || "",
            family_history_other: record.family_history_other || "",
            past_history: record.past_history || "",
            past_history_other: record.past_history_other || "",
            lab_requests: record.lab_requests || "",
            created_at,
            menstrual_history: record.menstrual_history || "",
            pregnancy_history: record.pregnancy_history || "",
            general_survey: record.general_survey || "",
            skin_condition: record.skin_condition || "",
            heent_condition: record.heent_condition || "",
            chest_condition: record.chest_condition || "",
            heart_condition: record.heart_condition || "",
            abdomen_condition: record.abdomen_condition || "",
            extremities_condition: record.extremities_condition || "",
            smoking_history: record.smoking_history || "",
            drinking_history: record.drinking_history || "",
            exercise_history: record.exercise_history || "",
            social_history_other: record.social_history_other || "",
            gravida: record.gravida || "",
            para: record.para || "",
            pe_findings: record.pe_findings || "",
            term: record.term || "",
            premature: record.premature || "",
            abortion: record.abortion || "",
            live_birth: record.live_birth || "",
          }

          let result
          if (record.existingRecord?.id) {
            const { data, error: updateError } = await supabase
              .from("health_history")
              .update(dataToSave)
              .eq("id", record.existingRecord.id)
              .select()

            if (updateError) {
              throw new Error(`Database error while updating: ${updateError.message}`)
            }
            result = data
          } else {
            const { data, error: insertError } = await supabase.from("health_history").insert(dataToSave).select()

            if (insertError) {
              throw new Error(`Database error while inserting: ${insertError.message}`)
            }
            result = data
          }

          if (!result || result.length === 0) {
            throw new Error("No data returned from database operation")
          }
          successCount++
        } catch (recordError) {
          errorCount++
          const errorMessage = recordError instanceof Error ? recordError.message : "An unexpected error occurred"
          errors.push(`Error processing record for user ${record.user_id}: ${errorMessage}`)
          console.error("Error processing record:", {
            error: recordError,
            record: record,
            userId: record.user_id,
          })
        }
      }

      if (successCount > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully processed ${successCount} records${
            errorCount > 0 ? `. Failed to process ${errorCount} records.` : "."
          }`,
          variant: errorCount > 0 ? "destructive" : "default",
        })
      } else {
        toast({
          title: "Import Failed",
          description: "No records were successfully processed.",
          variant: "destructive",
        })
      }

      if (errors.length > 0) {
        const errorMessage = errors
          .slice(0, 3)
          .map((err) => `• ${err}`)
          .join("\n")
        toast({
          title: "Import Errors",
          description: errorMessage + (errors.length > 3 ? "\n• ..." : ""),
          variant: "destructive",
        })
      }

      if (successCount > 0) {
        setImportedData([])
        setIsImportModalOpen(false)
        await fetchHealthRecords()
      }
    } catch (error) {
      console.error("Error importing records:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? `Import failed: ${error.message}` : "An unexpected error occurred during import.",
        variant: "destructive",
      })
    }
  }

  const handleExport = async () => {
    try {
      const { data: records, error } = await supabase
        .from("health_history")
        .select(`
          *,
          userss:user_id (
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      if (!records || records.length === 0) {
        toast({
          title: "No Records",
          description: "There are no records to export.",
          variant: "default",
        })
        return
      }

      const exportData = records.map((record) => ({
        "User ID": record.user_id,
        "First Name": record.userss?.first_name || "",
        "Last Name": record.userss?.last_name || "",
        "Created At": format(new Date(record.created_at), "PPP"),
        Allergy: record.allergy || "",
        Immunizations: record.immunizations || "",
        "Surgical History": record.surgical_history || "",
        Neurologic: record.neurologic || "",
        "Family History": record.family_history || "",
        "Family History Other": record.family_history_other || "",
        "Past History": record.past_history || "",
        "Past History Other": record.past_history_other || "",
        "Lab Requests": record.lab_requests || "",
        "Menstrual History": record.menstrual_history || "",
        "Pregnancy History": record.pregnancy_history || "",
        "General Survey": record.general_survey || "",
        "Skin Condition": record.skin_condition || "",
        "HEENT Condition": record.heent_condition || "",
        "Chest Condition": record.chest_condition || "",
        "Heart Condition": record.heart_condition || "",
        "Abdomen Condition": record.abdomen_condition || "",
        "Extremities Condition": record.extremities_condition || "",
        "Smoking History": record.smoking_history || "",
        "Drinking History": record.drinking_history || "",
        "Exercise History": record.exercise_history || "",
        "Social History Other": record.social_history_other || "",
        Gravida: record.gravida || "",
        Para: record.para || "",
        "PE Findings": record.pe_findings || "",
        Term: record.term || "",
        Premature: record.premature || "",
        Abortion: record.abortion || "",
        "Live Birth": record.live_birth || "",
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)

      const colWidths = Object.keys(exportData[0]).map(() => ({ wch: 20 }))
      ws["!cols"] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Health History Records")

      const currentDate = format(new Date(), "yyyy-MM-dd")
      const fileName = `health_history_records_${currentDate}.xlsx`

      XLSX.writeFile(wb, fileName)

      toast({
        title: "Export Successful",
        description: `${records.length} records have been exported to ${fileName}`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error exporting records:", error)
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred while exporting records.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Health History Records</h1>
        <div className="space-x-2">
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import Records
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Records
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
        </div>
      </div>

      <div className="border rounded-lg h-[calc(100vh-120px)]">
        <div className="relative h-full">
          <div className="absolute inset-0 overflow-auto">
            <div className="overflow-visible">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-20">
                  <TableRow className="border-b">
                    <TableHead className="bg-white min-w-[150px] h-14">User ID</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">First Name</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Last Name</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Allergy</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Immunizations</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Surgical History</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Neurologic</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Family History</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Past History</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Lab Requests</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Created At</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">General Survey</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Skin Condition</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">HEENT Condition</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Chest Condition</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Heart Condition</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Abdomen Condition</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Extremities</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Smoking History</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Drinking History</TableHead>
                    <TableHead className="bg-white min-w-[150px] h-14">Exercise History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={21} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : healthRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={21} className="text-center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    healthRecords.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="min-w-[150px]">{String(record.user_id ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.first_name ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.last_name ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.allergy ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.immunizations ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.surgical_history ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.neurologic ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.family_history ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.past_history ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.lab_requests ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{format(new Date(record.created_at), "PPP")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.general_survey ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.skin_condition ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.heent_condition ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.chest_condition ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.heart_condition ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.abdomen_condition ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.extremities_condition ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.smoking_history ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.drinking_history ?? "")}</TableCell>
                        <TableCell className="min-w-[150px]">{String(record.exercise_history ?? "")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="w-full max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing. Existing records are highlighted and will be updated.
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full" style={{ height: "60vh" }}>
            <div className="absolute inset-0 overflow-auto">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {importedData.length > 0 &&
                        Object.keys(importedData[0])
                          .filter((key) => !["existingRecord", "matchReason"].includes(key))
                          .map((key) => (
                            <TableHead key={key} className="whitespace-nowrap bg-white">
                              {key}
                            </TableHead>
                          ))}
                      <TableHead className="whitespace-nowrap bg-white">Status</TableHead>
                      <TableHead className="whitespace-nowrap bg-white">Match Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedData.map((row, index) => (
                      <TableRow key={index} className={row.existingRecord ? "bg-yellow-50" : ""}>
                        {Object.entries(row)
                          .filter(([key]) => !["existingRecord", "matchReason"].includes(key))
                          .map(([key, value], cellIndex) => (
                            <TableCell key={cellIndex} className="whitespace-nowrap">
                              {row.existingRecord &&
                                row.existingRecord[key as keyof HealthHistoryRecord] !== undefined && (
                                  <div className="text-xs text-gray-500 mb-1">
                                    Current: {String(row.existingRecord[key as keyof HealthHistoryRecord])}
                                  </div>
                                )}
                              <div
                                className={
                                  row.existingRecord && row.existingRecord[key as keyof HealthHistoryRecord] !== value
                                    ? "font-bold text-blue-600"
                                    : ""
                                }
                              >
                                {String(value ?? "")}
                              </div>
                            </TableCell>
                          ))}
                        <TableCell className="whitespace-nowrap">
                          {row.existingRecord ? (
                            <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                              Update
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">
                              New
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
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
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>Import Records</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

