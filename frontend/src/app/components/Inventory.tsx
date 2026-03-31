import { useState, useEffect } from "react";
import { formatDate } from "../utils/date";
import { Search, AlertTriangle, Package, Pencil, Trash2 } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "./ui/utils";
import { inventoryApi, medicinesApi } from "../utils/api";

interface InventoryItem {
  id: string;
  medicineId: string;
  medicineName: string;
  manufacturer?: string;
  batchNumber: string;
  purchaseQuantity: number;
  quantity: number;
  reorderLevel: number;
  expiryDate: string;
  unitPrice: number;
  location: string;
  salesReferences?: number;
}

interface MedicineOption {
  id: string;
  name: string;
  status: "active" | "inactive";
}

function normalizeInventoryItem(item: any): InventoryItem {
  const get = (camel: string, lower: string) =>
    item?.[camel] !== undefined ? item[camel] : item?.[lower];

  return {
    id: String(get("id", "id") ?? ""),
    medicineId: String(get("medicineId", "medicineid") ?? ""),
    medicineName: String(get("medicineName", "medicinename") ?? ""),
    manufacturer: get("manufacturer", "manufacturer")
      ? String(get("manufacturer", "manufacturer"))
      : "",
    batchNumber: String(get("batchNumber", "batchnumber") ?? ""),
    purchaseQuantity: Number(get("purchaseQuantity", "purchasequantity") ?? get("quantity", "quantity") ?? 0),
    quantity: Number(get("quantity", "quantity") ?? 0),
    reorderLevel: Number(get("reorderLevel", "reorderlevel") ?? 100),
    expiryDate: get("expiryDate", "expirydate")
      ? String(get("expiryDate", "expirydate"))
      : "",
    unitPrice: Number(get("unitPrice", "unitprice") ?? 0),
    location: get("location", "location") ? String(get("location", "location")) : "",
    salesReferences: Number(get("salesReferences", "salesreferences") ?? 0),
  };
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [newBatch, setNewBatch] = useState<Partial<InventoryItem>>({
    medicineId: "",
    medicineName: "",
    manufacturer: "",
    expiryDate: "",
    quantity: 0,
    location: "Shelf A",
    reorderLevel: 100, // sensible default
  });

  useEffect(() => {
    loadInventory();
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      const res = await medicinesApi.getAll();
      setMedicines(
        (res.data || [])
          .map((m: any) => ({
            id: String(m.id),
            name: String(m.name || ""),
            status: m.status === "inactive" ? "inactive" : "active",
          }))
          .filter((medicine) => medicine.status === "active")
      );
    } catch (e) {
      console.error("Error loading medicines", e);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getAll();
      setInventory((response.data || []).map(normalizeInventoryItem));
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      (item.medicineName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batchNumber || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "all") return matchesSearch;
    
    const expiryStatus = getExpiryStatus(item.expiryDate).status;
    if (filterStatus === "expiring") {
      return matchesSearch && (expiryStatus === "critical" || expiryStatus === "warning");
    }
    if (filterStatus === "low-stock") {
      return matchesSearch && item.quantity < (item.reorderLevel || 100);
    }
    
    return matchesSearch;
  });

  const totalValue = filteredInventory.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBatch = async () => {
    if (!editingItem) return;
    if (Number(editingItem.quantity || 0) > Number(editingItem.purchaseQuantity || 0)) {
      alert(`Quantity cannot exceed purchased quantity (${editingItem.purchaseQuantity}).`);
      return;
    }

    try {
      await inventoryApi.update(editingItem.id, {
        expiryDate: editingItem.expiryDate || null,
        quantity: Number(editingItem.quantity || 0),
        location: (editingItem.location || "").trim() || "Shelf A",
        reorderLevel: Number(editingItem.reorderLevel || 100),
      });
      setIsEditDialogOpen(false);
      setEditingItem(null);
      await loadInventory();
    } catch (error) {
      console.error("Error updating batch:", error);
      alert("Failed to update inventory batch.");
    }
  };

  const handleDeleteBatch = async (item: InventoryItem) => {
    if ((item.salesReferences || 0) > 0) {
      alert("This batch cannot be deleted because it is already used in sales records.");
      return;
    }

    const shouldDelete = window.confirm(
      `Delete batch ${item.batchNumber} for ${item.medicineName}? This cannot be undone.`
    );
    if (!shouldDelete) return;

    try {
      await inventoryApi.delete(item.id);
      await loadInventory();
    } catch (error) {
      console.error("Error deleting batch:", error);
      alert("Failed to delete inventory batch.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Inventory Management</h1>
        <p className="text-gray-500 mt-1">Batch-wise stock view with expiry tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Batches</p>
              <p className="text-2xl mt-1">{filteredInventory.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inventory Value</p>
              <p className="text-2xl mt-1">Rs {totalValue.toFixed(2)}</p>
            </div>
            <Package className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expiring Soon</p>
              <p className="text-2xl mt-1">
                {inventory.filter(
                  (item) =>
                    getExpiryStatus(item.expiryDate).status === "critical" ||
                    getExpiryStatus(item.expiryDate).status === "warning"
                ).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by medicine or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setIsAddDialogOpen(true)} className="ml-auto">
          Add Stock
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Batch</DialogTitle>
            <DialogDescription>Enter batch details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Medicine</Label>
                <Select
                  value={newBatch.medicineId}
                  onValueChange={(val) => {
                    const med = medicines.find((m) => m.id === val);
                    setNewBatch((prev) => ({
                      ...prev,
                      medicineId: val,
                      medicineName: med?.name || "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input
                  value="Auto-generated on save"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={newBatch.expiryDate}
                  onChange={(e) =>
                    setNewBatch((p) => ({ ...p, expiryDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={newBatch.quantity || ""}
                  onChange={(e) =>
                    setNewBatch((p) => ({
                      ...p,
                      quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={newBatch.location}
                  onChange={(e) =>
                    setNewBatch((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={newBatch.reorderLevel || ""}
                  onChange={(e) =>
                    setNewBatch((p) => ({
                      ...p,
                      reorderLevel: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              // basic required fields check
              if (!newBatch.medicineId || !Number.isFinite(Number(newBatch.quantity)) || Number(newBatch.quantity) <= 0) {
                alert("Please choose a medicine and valid quantity.");
                return;
              }
              try {
                await inventoryApi.addBatch({
                  medicineId: newBatch.medicineId,
                  expiryDate: newBatch.expiryDate || null,
                  quantity: Number(newBatch.quantity),
                  location: (newBatch.location || "").trim() || "Shelf A",
                  reorderLevel: Number(newBatch.reorderLevel || 100),
                });
                setIsAddDialogOpen(false);
                setNewBatch({
                  medicineId: "",
                  medicineName: "",
                  expiryDate: "",
                  quantity: 0,
                  location: "Shelf A",
                  reorderLevel: 100,
                });
                loadInventory();
              } catch (err) {
                console.error("Error adding batch", err);
                alert(err instanceof Error ? err.message : "Failed to add stock batch.");
              }
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Inventory Batch</DialogTitle>
            <DialogDescription>Update the selected batch details.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medicine</Label>
                  <Input value={editingItem.medicineName} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Input value={editingItem.batchNumber} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={editingItem.expiryDate || ""}
                    onChange={(e) =>
                      setEditingItem((prev) => (prev ? { ...prev, expiryDate: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    max={editingItem.purchaseQuantity}
                    value={editingItem.quantity}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, quantity: parseInt(e.target.value, 10) || 0 } : prev
                      )
                    }
                  />
                  <p className="text-xs text-gray-500">Max purchasable quantity: {editingItem.purchaseQuantity}</p>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editingItem.location || ""}
                    onChange={(e) =>
                      setEditingItem((prev) => (prev ? { ...prev, location: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingItem.reorderLevel}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, reorderLevel: parseInt(e.target.value, 10) || 0 } : prev
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBatch}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Batch Number</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Expiry Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Batch Value</TableHead>
              <TableHead>Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item, index) => {
              const expiryStatus = getExpiryStatus(item.expiryDate);
              const stockStatus = getStockStatus(item.quantity);
              const batchValue = item.quantity * item.unitPrice;

              return (
                <TableRow
                  key={index}
                  className={cn(
                    expiryStatus.status === "critical" && "bg-red-50",
                    expiryStatus.status === "warning" && "bg-yellow-50"
                  )}
                >
                  <TableCell>
                    <div>
                      <p>{item.medicineName}</p>
                      <p className="text-xs text-gray-500">{item.manufacturer}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.batchNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{item.quantity}</span>
                      {stockStatus.status !== "adequate" && (
                        <Badge variant={stockStatus.variant as any} className="text-xs">
                          {stockStatus.status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.expiryDate ? formatDate(item.expiryDate) : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={expiryStatus.variant as any}>
                      {expiryStatus.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>Rs {Number(item.unitPrice || 0).toFixed(2)}</TableCell>
                  <TableCell>Rs {Number(batchValue || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBatch(item)}
                        disabled={(item.salesReferences || 0) > 0}
                        title={
                          (item.salesReferences || 0) > 0
                            ? "Cannot delete: used in sales records"
                            : "Delete batch"
                        }
                      >
                        <Trash2
                          className={`w-4 h-4 ${(item.salesReferences || 0) > 0 ? "text-gray-400" : "text-red-500"}`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function getExpiryStatus(expiryDate: string) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return { status: "expired", label: "Expired", variant: "destructive" };
  if (daysUntilExpiry < 30) return { status: "critical", label: "Critical", variant: "destructive" };
  if (daysUntilExpiry < 60) return { status: "warning", label: "Warning", variant: "secondary" };
  return { status: "good", label: "Good", variant: "default" };
}

function getStockStatus(quantity: number) {
  if (quantity < 50) return { status: "critical", variant: "destructive" };
  if (quantity < 100) return { status: "low", variant: "secondary" };
  return { status: "adequate", variant: "default" };
}

