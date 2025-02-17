"use client"

import type React from "react"

import { useState, useRef, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Upload, Download, FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"

interface Record {
  id: number
  name: string
  age: number
  lastVisit: string
  condition: string
}

// Mock data for existing records
const existingRecords: Record[] = [
  { id: 1, name: "John Doe", age: 35, lastVisit: "2023-05-15", condition: "Hypertension" },
  { id: 2, name: "Jane Smith", age: 28, lastVisit: "2023-06-22", condition: "Diabetes" },
  { id: 3, name: "Bob Johnson", age: 45, lastVisit: "2023-04-10", condition: "Asthma" },
]

export default function DataManagement() {
  const [records, setRecords] = useState<Record[]>(existingRecords)
  const [importedData, setImportedData] = useState<Record[]>([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record[]
      setImportedData(jsonData)
      setIsImportModalOpen(true)
    }

    reader.readAsArrayBuffer(file)
  }

  const handleBatchImport = () => {
    setRecords((prevRecords) => [...prevRecords, ...importedData])
    setImportedData([])
    setIsImportModalOpen(false)
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
          <Button variant="outline">
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
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Last Visit</TableHead>
            <TableHead>Condition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.name}</TableCell>
              <TableCell>{record.age}</TableCell>
              <TableCell>{record.lastVisit}</TableCell>
              <TableCell>{record.condition}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Batch Import Data</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-6 w-6 text-green-500" />
              <span className="font-medium">Excel file uploaded successfully</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {importedData.length > 0 &&
                      Object.keys(importedData[0]).map((header) => <TableHead key={header}>{header}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedData.map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <TableCell key={cellIndex}>{value as React.ReactNode}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="overwrite" />
              <Label htmlFor="overwrite">Overwrite existing records</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBatchImport}>Import Data</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

