import { useState } from "react";
import { Search, FileText, Check, X } from "lucide-react";
import { formatDate } from "../utils/date";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Separator } from "./ui/separator";

interface Prescription {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  date: string;
  status: "pending" | "fulfilled" | "partially-fulfilled";
  items: PrescriptionItem[];
}

interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  quantity: number;
  duration: string;
  available: boolean;
}

const mockPrescriptions: Prescription[] = [
  {
    id: "RX2024001",
    patientName: "John Smith",
    patientId: "PAT001",
    doctorName: "Dr. Sarah Johnson",
    date: "2024-12-28",
    status: "pending",
    items: [
      {
        medicineId: "MED001",
        medicineName: "Amoxicillin 500mg",
        dosage: "1 capsule",
        quantity: 21,
        duration: "7 days (3 times daily)",
        available: true,
      },
      {
        medicineId: "MED002",
        medicineName: "Ibuprofen 400mg",
        dosage: "1 tablet",
        quantity: 14,
        duration: "7 days (2 times daily)",
        available: true,
      },
    ],
  },
  {
    id: "RX2024002",
    patientName: "Emma Davis",
    patientId: "PAT002",
    doctorName: "Dr. Michael Chen",
    date: "2024-12-28",
    status: "pending",
    items: [
      {
        medicineId: "MED003",
        medicineName: "Paracetamol 500mg",
        dosage: "1-2 tablets",
        quantity: 20,
        duration: "As needed",
        available: true,
      },
    ],
  },
  {
    id: "RX2024003",
    patientName: "Robert Wilson",
    patientId: "PAT003",
    doctorName: "Dr. Sarah Johnson",
    date: "2024-12-27",
    status: "fulfilled",
    items: [
      {
        medicineId: "MED004",
        medicineName: "Metformin 500mg",
        dosage: "1 tablet",
        quantity: 60,
        duration: "30 days (2 times daily)",
        available: true,
      },
    ],
  },
];

export function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(mockPrescriptions);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredPrescriptions = prescriptions.filter((rx) =>
    rx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rx.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rx.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDialogOpen(true);
  };

  const handleFulfill = (prescriptionId: string) => {
    setPrescriptions((prev) =>
      prev.map((rx) =>
        rx.id === prescriptionId ? { ...rx, status: "fulfilled" } : rx
      )
    );
    setIsDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      fulfilled: "default",
      "partially-fulfilled": "secondary",
    };
    return variants[status] || "default";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Prescription Fulfillment</h1>
        <p className="text-gray-500 mt-1">Process and fulfill patient prescriptions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl mt-1">
                {prescriptions.filter((rx) => rx.status === "pending").length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fulfilled Today</p>
              <p className="text-2xl mt-1">
                {prescriptions.filter((rx) => rx.status === "fulfilled").length}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Prescriptions</p>
              <p className="text-2xl mt-1">{prescriptions.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search prescriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prescription ID</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Patient ID</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPrescriptions.map((prescription) => (
              <TableRow key={prescription.id}>
                <TableCell>{prescription.id}</TableCell>
                <TableCell>{prescription.patientName}</TableCell>
                <TableCell>{prescription.patientId}</TableCell>
                <TableCell className="text-gray-500">{prescription.doctorName}</TableCell>
                <TableCell>{formatDate(prescription.date)}</TableCell>
                <TableCell>{prescription.items.length} items</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadge(prescription.status)}>
                    {prescription.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewPrescription(prescription)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              Review prescription and fulfill order
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Prescription ID</p>
                  <p>{selectedPrescription.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p>{selectedPrescription.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Patient Name</p>
                  <p>{selectedPrescription.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Patient ID</p>
                  <p>{selectedPrescription.patientId}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Prescribed By</p>
                  <p>{selectedPrescription.doctorName}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-3">Prescribed Medicines</h3>
                <div className="space-y-3">
                  {selectedPrescription.items.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.medicineName}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Dosage: {item.dosage}
                          </p>
                          <p className="text-sm text-gray-500">
                            Duration: {item.duration}
                          </p>
                          <p className="text-sm text-gray-500">
                            Quantity: {item.quantity} units
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.available ? (
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="w-3 h-3 mr-1" />
                              Out of Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPrescription.status === "pending" && (
                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleFulfill(selectedPrescription.id)}>
                    Fulfill Prescription
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
