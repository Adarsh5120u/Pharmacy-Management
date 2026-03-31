import { useState, useEffect } from "react";
import { Plus, Search, Edit, Power } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { medicinesApi } from "../utils/api";

interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  strength: string;
  form: string;
  price: number;
  status: "active" | "inactive";
}

export function MedicineMaster() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    genericName: "",
    category: "",
    manufacturer: "",
    strength: "",
    form: "",
    price: 0,
  });

  // Fetch medicines from backend
  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const response = await medicinesApi.getAll();
      setMedicines(
        (response.data || []).map((m: any) => ({
          ...m,
          id: String(m.id),
          price: Number(m.price || 0),
          status: m.status === "inactive" ? "inactive" : "active",
        }))
      );
    } catch (error) {
      console.error("Error loading medicines:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = medicines.filter((med) =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsDialogOpen(true);
    setFormData({
      name: medicine.name,
      genericName: medicine.genericName,
      category: medicine.category,
      manufacturer: medicine.manufacturer,
      strength: medicine.strength,
      form: medicine.form,
      price: medicine.price,
    });
  };

  const handleAdd = () => {
    setEditingMedicine(null);
    setIsDialogOpen(true);
    setFormData({
      name: "",
      genericName: "",
      category: "",
      manufacturer: "",
      strength: "",
      form: "",
      price: 0,
    });
  };

  const handleToggleStatus = async (id: string) => {
    const medicine = medicines.find(m => m.id === id);
    if (!medicine) return;

    try {
      const newStatus = medicine.status === "active" ? "inactive" : "active";
      const response = await medicinesApi.update(id, { ...medicine, status: newStatus });
      const updatedMedicine = response.data;
      setMedicines((prev) =>
        prev.map((med) =>
          med.id === id
            ? {
                ...med,
                status: updatedMedicine?.status === "inactive" ? "inactive" : "active",
              }
            : med
        )
      );
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Generate medicine code from name if not provided
      const medicineCode = formData.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
      
      const medicineData = {
        name: formData.name,
        genericName: formData.genericName,
        medicineCode: medicineCode,
        category: formData.category,
        manufacturer: formData.manufacturer,
        dosageForm: formData.form, // Map form -> dosageForm
        strength: formData.strength,
        price: Number(formData.price || 0),
        prescriptionRequired: true, // Default to true
      };

      if (editingMedicine) {
        // Update existing medicine
        await medicinesApi.update(editingMedicine.id, medicineData);
      } else {
        // Create new medicine
        const response = await medicinesApi.create(medicineData);
        console.log('Medicine created:', response);
      }

      await loadMedicines();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving medicine:", error);
      alert('Error saving medicine. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Medicines</h1>
          <p className="text-gray-500 mt-1">Manage medicine inventory and details</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search medicines..."
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
              <TableHead>Medicine ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Generic Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMedicines.map((medicine) => (
              <TableRow key={medicine.id}>
                <TableCell>{medicine.id}</TableCell>
                <TableCell>{medicine.name}</TableCell>
                <TableCell className="text-gray-500">{medicine.genericName}</TableCell>
                <TableCell>{medicine.category}</TableCell>
                <TableCell>{medicine.strength}</TableCell>
                <TableCell>{medicine.form}</TableCell>
                <TableCell>Rs {medicine.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={medicine.status === "active" ? "default" : "secondary"}>
                    {medicine.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(medicine)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleStatus(medicine.id)}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMedicine ? "Edit Medicine" : "Add New Medicine"}
            </DialogTitle>
            <DialogDescription>
              {editingMedicine
                ? "Update medicine information"
                : "Add a new medicine to the master list"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Medicine Name</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => updateFormField('name', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="generic">Generic Name</Label>
              <Input 
                id="generic" 
                value={formData.genericName} 
                onChange={(e) => updateFormField('genericName', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => updateFormField('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Antibiotics">Antibiotics</SelectItem>
                  <SelectItem value="Pain Relief">Pain Relief</SelectItem>
                  <SelectItem value="Diabetes">Diabetes</SelectItem>
                  <SelectItem value="Cardiovascular">Cardiovascular</SelectItem>
                  <SelectItem value="Vitamins">Vitamins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input 
                id="manufacturer" 
                value={formData.manufacturer} 
                onChange={(e) => updateFormField('manufacturer', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strength">Strength</Label>
              <Input 
                id="strength" 
                value={formData.strength} 
                onChange={(e) => updateFormField('strength', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form">Form</Label>
              <Select value={formData.form} onValueChange={(value) => updateFormField('form', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                  <SelectItem value="Capsule">Capsule</SelectItem>
                  <SelectItem value="Syrup">Syrup</SelectItem>
                  <SelectItem value="Injection">Injection</SelectItem>
                  <SelectItem value="Cream">Cream</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Unit Price (Rs)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => updateFormField('price', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : editingMedicine ? "Update" : "Add"} Medicine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

