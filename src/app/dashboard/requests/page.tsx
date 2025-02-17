import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, CheckCircle, XCircle, ImageIcon } from "lucide-react"

const requests = [
  {
    id: 1,
    firstName: "Alice",
    middleName: "Marie",
    lastName: "Cooper",
    dateOfBirth: "1995-03-10",
    gender: "Female",
    phoneNumber: "+1234567890",
    status: "Pending",
    idImage: "/placeholder.svg?height=50&width=50",
  },
  {
    id: 2,
    firstName: "Bob",
    middleName: "Allen",
    lastName: "Dylan",
    dateOfBirth: "1988-07-24",
    gender: "Male",
    phoneNumber: "+1987654321",
    status: "Pending",
    idImage: "/placeholder.svg?height=50&width=50",
  },
  {
    id: 3,
    firstName: "Charlie",
    middleName: "David",
    lastName: "Brown",
    dateOfBirth: "1992-11-15",
    gender: "Male",
    phoneNumber: "+1122334455",
    status: "Pending",
    idImage: "/placeholder.svg?height=50&width=50",
  },
]

export default function PatientAccountRequests() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patient Account Requests</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Input placeholder="Search requests..." className="max-w-sm" />
        <Button variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </div>
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
              <TableHead>Status</TableHead>
              <TableHead>ID Image</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.firstName}</TableCell>
                <TableCell>{request.middleName}</TableCell>
                <TableCell>{request.lastName}</TableCell>
                <TableCell>{request.dateOfBirth}</TableCell>
                <TableCell>{request.gender}</TableCell>
                <TableCell>{request.phoneNumber}</TableCell>
                <TableCell>{request.status}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="mr-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

