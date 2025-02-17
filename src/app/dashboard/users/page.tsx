"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Search, MoreHorizontal, ImageIcon } from "lucide-react"

const adminUsers = [
  {
    id: 1,
    firstName: "John",
    middleName: "Michael",
    lastName: "Doe",
    dateOfBirth: "1985-05-15",
    gender: "Male",
    email: "john@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: 2,
    firstName: "Jane",
    middleName: "Elizabeth",
    lastName: "Smith",
    dateOfBirth: "1990-08-22",
    gender: "Female",
    email: "jane@example.com",
    role: "Admin",
    status: "Active",
  },
]

const staffUsers = [
  {
    id: 1,
    firstName: "Alice",
    middleName: "Marie",
    lastName: "Cooper",
    dateOfBirth: "1988-03-15",
    gender: "Female",
    phoneNumber: "+1234567890",
    role: "Doctor",
    status: "Active",
    idImage: "/placeholder.svg?height=50&width=50",
  },
  {
    id: 2,
    firstName: "Bob",
    middleName: "",
    lastName: "Dylan",
    dateOfBirth: "1975-09-22",
    gender: "Male",
    phoneNumber: "+1987654321",
    role: "Nurse",
    status: "Active",
    idImage: "/placeholder.svg?height=50&width=50",
  },
]

const patientUsers = [
  {
    id: 1,
    firstName: "Emma",
    middleName: "Rose",
    lastName: "Johnson",
    dateOfBirth: "1992-07-12",
    gender: "Female",
    phoneNumber: "+1122334455",
    role: "Patient",
    status: "Active",
    idImage: "/placeholder.svg?height=50&width=50",
  },
  {
    id: 2,
    firstName: "Michael",
    middleName: "James",
    lastName: "Brown",
    dateOfBirth: "1980-11-30",
    gender: "Male",
    phoneNumber: "+1555666777",
    role: "Patient",
    status: "Active",
    idImage: "/placeholder.svg?height=50&width=50",
  },
]

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("admin")

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <Input placeholder="Search users..." className="max-w-sm" />
        <Button variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="admin">Admin Users</TabsTrigger>
          <TabsTrigger value="staff">Staff Users</TabsTrigger>
          <TabsTrigger value="patient">Patient Users</TabsTrigger>
        </TabsList>
        <TabsContent value="admin">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Middle Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.firstName}</TableCell>
                    <TableCell>{user.middleName}</TableCell>
                    <TableCell>{user.lastName}</TableCell>
                    <TableCell>{user.dateOfBirth}</TableCell>
                    <TableCell>{user.gender}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="staff">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Middle Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID Image</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.firstName}</TableCell>
                    <TableCell>{user.middleName}</TableCell>
                    <TableCell>{user.lastName}</TableCell>
                    <TableCell>{user.dateOfBirth}</TableCell>
                    <TableCell>{user.gender}</TableCell>
                    <TableCell>{user.phoneNumber}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="patient">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Middle Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID Image</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patientUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.firstName}</TableCell>
                    <TableCell>{user.middleName}</TableCell>
                    <TableCell>{user.lastName}</TableCell>
                    <TableCell>{user.dateOfBirth}</TableCell>
                    <TableCell>{user.gender}</TableCell>
                    <TableCell>{user.phoneNumber}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

