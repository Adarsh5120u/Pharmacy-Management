import { useEffect, useMemo, useState } from "react";
import { formatDate, formatDateTime } from "../utils/date";
import { Plus, Search, Eye, Trash2, Loader2, Download } from "lucide-react";
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
import { medicinesApi, purchaseOrdersApi, suppliersApi } from "../utils/api";
import { createPurchaseOrderReportPdfBlob } from "../utils/purchaseOrderReportPdf";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  supplierId: string;
  supplierName: string;
  status: "pending" | "approved" | "received" | "cancelled";
  totalAmount: number;
  itemCount: number;
}

interface POItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface MedicineOption {
  id: string;
  name: string;
  price: number;
}

interface PurchaseOrderDetails {
  id: string;
  poNumber: string;
  orderDate: string;
  supplierName: string;
  status: string;
  receivedAt?: string;
  items: Array<{
    id: string;
    medicineId: string;
    medicineName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    receivedQuantity?: number;
    expiryDate?: string;
    batchNumber?: string;
    receivedAt?: string;
  }>;
}

interface ReceiveItemInput {
  itemId: string;
  medicineId: string;
  medicineName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  expiryDate: string;
}

interface GeneratedReportPayload {
  title: string;
  fileName: string;
  blob: Blob;
}

interface PurchaseOrdersProps {
  onPurchaseOrderReportGenerated?: (payload: GeneratedReportPayload) => void;
}

const ORDER_STATUSES: PurchaseOrder["status"][] = ["pending", "approved", "received", "cancelled"];
const CREATABLE_ORDER_STATUSES: PurchaseOrder["status"][] = ["pending", "approved", "cancelled"];
const STATUS_STEP_INDEX: Record<PurchaseOrder["status"], number> = {
  pending: 0,
  approved: 1,
  received: 2,
  cancelled: 3,
};

const isBackwardStatusTransition = (
  currentStatus: PurchaseOrder["status"],
  nextStatus: PurchaseOrder["status"]
) => STATUS_STEP_INDEX[nextStatus] < STATUS_STEP_INDEX[currentStatus];

const isLockedAfterReceivedTransition = (
  currentStatus: PurchaseOrder["status"],
  nextStatus: PurchaseOrder["status"]
) => currentStatus === "received" && nextStatus !== "received";

function downloadReport(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function mapPurchaseOrderDetails(data: any): PurchaseOrderDetails {
  return {
    id: String(data.id ?? ""),
    poNumber: String(data.poNumber ?? data.ponumber ?? `PO${data.id ?? ""}`),
    orderDate: String(data.orderDate ?? data.orderdate ?? ""),
    supplierName: String(data.supplierName ?? data.suppliername ?? "Unknown Supplier"),
    status: String(data.status ?? "pending"),
    receivedAt: String(data.receivedAt ?? data.receivedat ?? ""),
    items: (data.items || []).map((item: any) => ({
      id: String(item.id ?? ""),
      medicineId: String(item.medicineId ?? item.medicineid ?? ""),
      medicineName: String(item.medicineName ?? item.medicinename ?? ""),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice ?? item.unitprice ?? 0),
      lineTotal: Number(item.lineTotal ?? item.linetotal ?? 0),
      receivedQuantity:
        item.receivedQuantity !== undefined || item.receivedquantity !== undefined
          ? Number(item.receivedQuantity ?? item.receivedquantity ?? 0)
          : undefined,
      expiryDate:
        item.expiryDate !== undefined || item.expirydate !== undefined
          ? String(item.expiryDate ?? item.expirydate ?? "")
          : undefined,
      batchNumber:
        item.batchNumber !== undefined || item.batchnumber !== undefined
          ? String(item.batchNumber ?? item.batchnumber ?? "")
          : undefined,
      receivedAt:
        item.receivedAt !== undefined || item.receivedat !== undefined
          ? String(item.receivedAt ?? item.receivedat ?? "")
          : undefined,
    })),
  };
}

function createPurchaseOrderReportFileName(poNumber: string, timestamp = new Date()) {
  const fileSafePoNumber =
    poNumber
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "purchase-order";

  const dateStamp = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(
    timestamp.getDate()
  ).padStart(2, "0")}_${String(timestamp.getHours()).padStart(2, "0")}${String(timestamp.getMinutes()).padStart(
    2,
    "0"
  )}`;

  return `${fileSafePoNumber}-received-report-${dateStamp}.pdf`;
}

function canGenerateReceivedReport(details: PurchaseOrderDetails) {
  return (
    String(details.status).toLowerCase() === "received" &&
    details.items.length > 0 &&
    details.items.every(
      (item) =>
        item.receivedQuantity !== undefined &&
        Number(item.receivedQuantity) > 0 &&
        Boolean(String(item.expiryDate || "").trim())
    )
  );
}

export function PurchaseOrders({ onPurchaseOrderReportGenerated }: PurchaseOrdersProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStatus, setSelectedStatus] = useState<PurchaseOrder["status"]>("pending");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [poItems, setPoItems] = useState<POItem[]>([]);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PurchaseOrderDetails | null>(null);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [receiveDialogLoading, setReceiveDialogLoading] = useState(false);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [reportLoadingId, setReportLoadingId] = useState<string | null>(null);
  const [receiveTargetOrder, setReceiveTargetOrder] = useState<PurchaseOrder | null>(null);
  const [receiveItems, setReceiveItems] = useState<ReceiveItemInput[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  const normalizeStatus = (value: any): PurchaseOrder["status"] => {
    const normalized = String(value || "").toLowerCase();
    if (ORDER_STATUSES.includes(normalized as PurchaseOrder["status"])) {
      return normalized as PurchaseOrder["status"];
    }
    return "pending";
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersResponse, suppliersResponse, medicinesResponse] = await Promise.all([
        purchaseOrdersApi.getAll(),
        suppliersApi.getAll(),
        medicinesApi.getAll(),
      ]);

      setOrders(
        (ordersResponse.data || []).map((order: any) => ({
          id: String(order.id ?? ""),
          poNumber: String(order.poNumber ?? order.ponumber ?? `PO${order.id ?? ""}`),
          orderDate: String(order.orderDate ?? order.orderdate ?? ""),
          supplierId: String(order.supplierId ?? order.supplierid ?? ""),
          supplierName: String(order.supplierName ?? order.suppliername ?? "Unknown Supplier"),
          status: normalizeStatus(order.status ?? order.orderstatus),
          totalAmount: Number(order.totalAmount ?? order.totalamount ?? 0),
          itemCount: Number(order.itemCount ?? order.itemcount ?? 0),
        }))
      );

      setSuppliers(
        (suppliersResponse.data || []).map((supplier: any) => ({
          id: String(supplier.id ?? supplier.supplier_id),
          name: String(supplier.name ?? supplier.supplier_name),
        }))
      );

      setMedicines(
        (medicinesResponse.data || []).map((medicine: any) => ({
          id: String(medicine.id),
          name: String(medicine.name),
          price: Number(medicine.price || 0),
        }))
      );
      return true;
    } catch (error) {
      console.error("Error loading purchase order data:", error);
      alert("Failed to load purchase order data from backend.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [orders, searchTerm]
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      approved: "default",
      received: "default",
      cancelled: "destructive",
    };
    return variants[status] || "default";
  };

  const addPOItem = () => {
    setPoItems((prev) => [...prev, { medicineId: "", medicineName: "", quantity: 1, unitPrice: 0 }]);
  };

  const removePOItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePOItem = (index: number, field: keyof POItem, value: any) => {
    setPoItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const calculateTotal = () => {
    return poItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const resetForm = () => {
    setSelectedSupplier("");
    setNewSupplierName("");
    setPoItems([]);
    setSelectedStatus("pending");
    setOrderDate(new Date().toISOString().split("T")[0]);
  };

  const handleCreatePurchaseOrder = async () => {
    try {
      const validItems = poItems.filter((item) => item.medicineId && item.quantity > 0 && item.unitPrice > 0);
      if (validItems.length === 0) {
        alert("Add at least one valid item.");
        return;
      }

      let supplierId = selectedSupplier;
      if (newSupplierName.trim()) {
        const createSupplierResponse = await suppliersApi.create({ supplierName: newSupplierName.trim() });
        supplierId = String(
          createSupplierResponse.data?.id ?? createSupplierResponse.data?.supplier_id ?? selectedSupplier
        );
      }

      if (!supplierId) {
        alert("Select an existing supplier or add a new supplier name.");
        return;
      }

      await purchaseOrdersApi.create({
        supplierId: Number(supplierId),
        orderDate,
        status: selectedStatus,
        items: validItems.map((item) => ({
          medicineId: Number(item.medicineId),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      await loadData();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      alert("Failed to create purchase order.");
    }
  };

  const resetReceiveDialog = () => {
    setIsReceiveDialogOpen(false);
    setReceiveDialogLoading(false);
    setReceiveSubmitting(false);
    setReceiveTargetOrder(null);
    setReceiveItems([]);
  };

  const createAndDownloadPurchaseOrderReport = async (details: PurchaseOrderDetails) => {
    if (!canGenerateReceivedReport(details)) {
      throw new Error("Receipt details are not available yet for this purchase order.");
    }

    const generatedAt = new Date();
    const fileName = createPurchaseOrderReportFileName(details.poNumber, generatedAt);
    const receivedAt =
      details.receivedAt ||
      details.items.find((item) => String(item.receivedAt || "").trim())?.receivedAt ||
      generatedAt.toISOString();

    const blob = createPurchaseOrderReportPdfBlob({
      poNumber: details.poNumber,
      supplierName: details.supplierName,
      orderDate: details.orderDate,
      receivedAt,
      generatedAt: generatedAt.toISOString(),
      status: "received",
      entries: details.items.map((item) => {
        const receivedQuantity = Number(item.receivedQuantity ?? item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice || 0);

        return {
          medicineName: item.medicineName,
          orderedQuantity: Number(item.quantity || 0),
          receivedQuantity,
          unitPrice,
          expiryDate: String(item.expiryDate || ""),
          lineTotal: receivedQuantity * unitPrice,
        };
      }),
    });

    downloadReport(blob, fileName);
    onPurchaseOrderReportGenerated?.({
      title: `${details.poNumber} receipt report ready`,
      fileName,
      blob,
    });
  };

  const handleDownloadPurchaseOrderReport = async (
    orderId: string,
    initialDetails?: PurchaseOrderDetails | null,
    options: { suppressErrorAlert?: boolean } = {}
  ) => {
    setReportLoadingId(orderId);

    try {
      const details =
        initialDetails && initialDetails.id === orderId
          ? initialDetails
          : mapPurchaseOrderDetails((await purchaseOrdersApi.getById(orderId)).data || {});

      if (String(details.status).toLowerCase() !== "received") {
        alert("Only received purchase orders can generate a receipt report.");
        return;
      }

      await createAndDownloadPurchaseOrderReport(details);
      return true;
    } catch (error) {
      console.error("Error downloading purchase order report:", error);
      if (!options.suppressErrorAlert) {
        alert(error instanceof Error ? error.message : "Failed to download purchase order report.");
      }
      return false;
    } finally {
      setReportLoadingId(null);
    }
  };

  const openReceiveDialog = async (order: PurchaseOrder) => {
    try {
      setReceiveDialogLoading(true);
      setReceiveTargetOrder(order);
      setReceiveItems([]);
      setIsReceiveDialogOpen(true);

      const response = await purchaseOrdersApi.getById(order.id);
      const items = (response.data?.items || []).map((item: any) => ({
        itemId: String(item.id ?? ""),
        medicineId: String(item.medicineId ?? item.medicineid ?? ""),
        medicineName: String(item.medicineName ?? item.medicinename ?? ""),
        orderedQuantity: Number(item.quantity || 0),
        receivedQuantity: Number(item.quantity || 0),
        expiryDate: "",
      }));

      if (items.length === 0) {
        alert("This purchase order has no items to receive.");
        resetReceiveDialog();
        return;
      }

      setReceiveItems(items);
    } catch (error) {
      console.error("Error loading purchase order items for receiving:", error);
      alert("Failed to load purchase order items.");
      resetReceiveDialog();
    } finally {
      setReceiveDialogLoading(false);
    }
  };

  const updateReceiveItem = (
    itemId: string,
    field: "receivedQuantity" | "expiryDate",
    value: string | number
  ) => {
    setReceiveItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, [field]: value } : item))
    );
  };

  const canSubmitReceive = useMemo(
    () =>
      receiveItems.length > 0 &&
      !receiveItems.some((item) => {
        const quantityReceived = Number(item.receivedQuantity);
        const orderedQuantity = Number(item.orderedQuantity);
        return (
          !Number.isInteger(quantityReceived) ||
          quantityReceived <= 0 ||
          quantityReceived > orderedQuantity ||
          !item.expiryDate
        );
      }),
    [receiveItems]
  );

  const handleStatusChange = async (orderId: string, nextStatus: PurchaseOrder["status"]) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      return;
    }

    const currentStatus = normalizeStatus(order.status);

    if (currentStatus === nextStatus) {
      return;
    }

    if (isLockedAfterReceivedTransition(currentStatus, nextStatus)) {
      alert('Status cannot be changed after it is marked as "received".');
      return;
    }

    if (isBackwardStatusTransition(currentStatus, nextStatus)) {
      alert(`Status cannot move backward from "${currentStatus}" to "${nextStatus}".`);
      return;
    }

    if (nextStatus === "received") {
      await openReceiveDialog(order);
      return;
    }

    if (
      currentStatus === "pending" &&
      nextStatus !== "pending" &&
      !window.confirm(
        `Confirm changing status from "${currentStatus}" to "${nextStatus}"? You will not be able to move it back.`
      )
    ) {
      return;
    }

    const previousOrders = orders;
    setOrders((prev) =>
      prev.map((existingOrder) =>
        existingOrder.id === orderId ? { ...existingOrder, status: nextStatus } : existingOrder
      )
    );

    try {
      await purchaseOrdersApi.updateStatus(orderId, nextStatus);
      await loadData();
    } catch (error) {
      console.error("Error updating purchase order status:", error);
      setOrders(previousOrders);
      alert("Failed to update purchase order status.");
    }
  };

  const handleConfirmReceive = async () => {
    if (!receiveTargetOrder) {
      return;
    }

    const invalidItem = receiveItems.find((item) => {
      const quantityReceived = Number(item.receivedQuantity);
      const orderedQuantity = Number(item.orderedQuantity);
      return (
        !Number.isInteger(quantityReceived) ||
        quantityReceived <= 0 ||
        quantityReceived > orderedQuantity ||
        !item.expiryDate
      );
    });

    if (invalidItem) {
      alert(
        `Enter valid received quantity and expiry date for "${invalidItem.medicineName}". Received quantity must be between 1 and ordered quantity.`
      );
      return;
    }

    if (
      !window.confirm(
        `Confirm changing status to "received" for ${receiveTargetOrder.poNumber}? This will add received stock to inventory and cannot be undone.`
      )
    ) {
      return;
    }

    const previousOrders = orders;
    setReceiveSubmitting(true);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === receiveTargetOrder.id ? { ...order, status: "received" } : order
      )
    );

    try {
      await purchaseOrdersApi.updateStatus(receiveTargetOrder.id, "received", {
        receivedItems: receiveItems.map((item) => ({
          itemId: Number(item.itemId),
          medicineId: Number(item.medicineId),
          quantityReceived: Number(item.receivedQuantity),
          expiryDate: String(item.expiryDate),
        })),
      });

      const reportGenerated = await handleDownloadPurchaseOrderReport(receiveTargetOrder.id, null, {
        suppressErrorAlert: true,
      });

      const refreshSucceeded = await loadData();

      resetReceiveDialog();

      if (!refreshSucceeded) {
        alert(
          reportGenerated
            ? "Purchase order marked as received and report generated, but the list could not be refreshed. Please reload the page."
            : "Purchase order marked as received, but the report or list refresh did not complete. Please reload the page."
        );
        return;
      }

      alert(
        reportGenerated
          ? "Purchase order marked as received. The report was downloaded and added to notifications."
          : "Purchase order marked as received, but the report could not be generated."
      );
    } catch (error) {
      console.error("Error receiving purchase order:", error);
      setOrders(previousOrders);
      alert(error instanceof Error ? error.message : "Failed to mark purchase order as received.");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const handleViewDetails = async (orderId: string) => {
    try {
      setDetailsLoading(true);
      setIsDetailsOpen(true);
      const response = await purchaseOrdersApi.getById(orderId);
      setSelectedOrderDetails(mapPurchaseOrderDetails(response.data || {}));
    } catch (error) {
      console.error("Error loading purchase order details:", error);
      setSelectedOrderDetails(null);
      alert("Failed to load purchase order details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Purchase Orders</h1>
          <p className="text-gray-500 mt-1">Manage supplier orders and deliveries</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search purchase orders..."
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
              <TableHead>PO Number</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Loading purchase orders...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const currentStatus = normalizeStatus(order.status);

                return (
                  <TableRow key={order.id}>
                    <TableCell>{order.poNumber}</TableCell>
                    <TableCell>{formatDate(order.orderDate)}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>{order.itemCount} items</TableCell>
                    <TableCell>{"\u20B9"} {order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        value={currentStatus}
                        onValueChange={(value) => handleStatusChange(order.id, normalizeStatus(value))}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((status) => (
                            <SelectItem
                              key={status}
                              value={status}
                              disabled={
                                isLockedAfterReceivedTransition(currentStatus, status) ||
                                isBackwardStatusTransition(currentStatus, status)
                              }
                            >
                              <Badge variant={getStatusBadge(status)}>{status}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(order.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {currentStatus === "received" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDownloadPurchaseOrderReport(order.id)}
                            disabled={reportLoadingId === order.id}
                            title="Download receipt report"
                          >
                            {reportLoadingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Select supplier and add items to create a new purchase order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Existing Supplier</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newSupplier">Or Add New Supplier Name</Label>
                <Input
                  id="newSupplier"
                  placeholder="Type new supplier name"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input id="orderDate" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as PurchaseOrder["status"])}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATABLE_ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        <Badge variant={getStatusBadge(status)}>{status}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Order Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPOItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {poItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                  No items added yet. Click "Add Item" to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {poItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-5 space-y-1">
                        <Label className="text-xs">Medicine</Label>
                        <Select
                          value={item.medicineId}
                          onValueChange={(value) => {
                            const medicine = medicines.find((m) => m.id === value);
                            if (medicine) {
                              setPoItems((prev) => {
                                const newItems = [...prev];
                                newItems[index] = {
                                  ...newItems[index],
                                  medicineId: value,
                                  medicineName: medicine.name,
                                  unitPrice: medicine.price,
                                };
                                return newItems;
                              });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select medicine" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicines.map((med) => (
                              <SelectItem key={med.id} value={med.id}>
                                {med.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity || ""}
                          onChange={(e) => updatePOItem(index, "quantity", parseInt(e.target.value, 10) || 1)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) => updatePOItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Total</Label>
                        <Input value={`${"\u20B9"} ${(item.quantity * item.unitPrice).toFixed(2)}`} disabled />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePOItem(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end p-3 bg-gray-100 rounded-lg">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-xl">{"\u20B9"} {calculateTotal().toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePurchaseOrder}
              disabled={
                (!selectedSupplier && !newSupplierName.trim()) ||
                poItems.length === 0 ||
                calculateTotal() <= 0
              }
            >
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReceiveDialogOpen}
        onOpenChange={(open) => {
          if (!open && !receiveSubmitting) {
            resetReceiveDialog();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Purchase Order</DialogTitle>
            <DialogDescription>
              Enter received quantity and expiry date for each item before marking this purchase order as received.
            </DialogDescription>
          </DialogHeader>

          {receiveDialogLoading ? (
            <div className="py-12 flex items-center justify-center text-gray-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading items...
            </div>
          ) : !receiveTargetOrder ? (
            <div className="py-12 text-center text-gray-500">No purchase order selected.</div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">PO Number</p>
                  <p>{receiveTargetOrder.poNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Current Status</p>
                  <Badge variant={getStatusBadge(receiveTargetOrder.status)}>
                    {receiveTargetOrder.status}
                  </Badge>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Ordered Qty</TableHead>
                      <TableHead>Received Qty</TableHead>
                      <TableHead>Expiry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiveItems.map((item) => {
                      const quantityReceived = Number(item.receivedQuantity);
                      const quantityInvalid =
                        !Number.isInteger(quantityReceived) ||
                        quantityReceived <= 0 ||
                        quantityReceived > item.orderedQuantity;
                      const expiryInvalid = !item.expiryDate;

                      return (
                        <TableRow key={item.itemId}>
                          <TableCell>{item.medicineName}</TableCell>
                          <TableCell>{item.orderedQuantity}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              max={item.orderedQuantity}
                              value={item.receivedQuantity || ""}
                              onChange={(e) =>
                                updateReceiveItem(
                                  item.itemId,
                                  "receivedQuantity",
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className={quantityInvalid ? "border-red-500" : ""}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) =>
                                updateReceiveItem(item.itemId, "expiryDate", e.target.value)
                              }
                              className={expiryInvalid ? "border-red-500" : ""}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-gray-500">
                Received quantity must be an integer between 1 and ordered quantity.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetReceiveDialog}
              disabled={receiveSubmitting || receiveDialogLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReceive}
              disabled={!canSubmitReceive || receiveSubmitting || receiveDialogLoading}
            >
              {receiveSubmitting ? "Saving..." : "Confirm Receive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setSelectedOrderDetails(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>View complete purchase order item details</DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-12 flex items-center justify-center text-gray-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading details...
            </div>
          ) : !selectedOrderDetails ? (
            <div className="py-12 text-center text-gray-500">No details available.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">PO Number</p>
                  <p>{selectedOrderDetails.poNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Order Date</p>
                  <p>{formatDate(selectedOrderDetails.orderDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Supplier</p>
                  <p>{selectedOrderDetails.supplierName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge variant={getStatusBadge(selectedOrderDetails.status)}>{selectedOrderDetails.status}</Badge>
                </div>
                {String(selectedOrderDetails.status).toLowerCase() === "received" && selectedOrderDetails.receivedAt ? (
                  <div>
                    <p className="text-gray-500">Received At</p>
                    <p>{formatDateTime(selectedOrderDetails.receivedAt)}</p>
                  </div>
                ) : null}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Qty</TableHead>
                      {String(selectedOrderDetails.status).toLowerCase() === "received" ? (
                        <TableHead>Received Qty</TableHead>
                      ) : null}
                      <TableHead>Unit Price</TableHead>
                      {String(selectedOrderDetails.status).toLowerCase() === "received" ? (
                        <TableHead>Expiry Date</TableHead>
                      ) : null}
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrderDetails.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.medicineName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        {String(selectedOrderDetails.status).toLowerCase() === "received" ? (
                          <TableCell>{item.receivedQuantity ?? "-"}</TableCell>
                        ) : null}
                        <TableCell>{"\u20B9"} {Number(item.unitPrice || 0).toFixed(2)}</TableCell>
                        {String(selectedOrderDetails.status).toLowerCase() === "received" ? (
                          <TableCell>{item.expiryDate ? formatDate(item.expiryDate) : "-"}</TableCell>
                        ) : null}
                        <TableCell>{"\u20B9"} {Number(item.lineTotal || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">Order Total</p>
                <p className="text-xl">
                  {"\u20B9"} {selectedOrderDetails.items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0).toFixed(2)}
                </p>
              </div>

              {String(selectedOrderDetails.status).toLowerCase() === "received" ? (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() =>
                      void handleDownloadPurchaseOrderReport(selectedOrderDetails.id, selectedOrderDetails)
                    }
                    disabled={reportLoadingId === selectedOrderDetails.id}
                  >
                    {reportLoadingId === selectedOrderDetails.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download Receipt Report
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
