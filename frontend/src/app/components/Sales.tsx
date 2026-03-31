import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Printer, Search, Loader2, FileText, RotateCcw, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "../utils/date";
import { downloadInvoicePdf } from "../utils/invoicePdf";
import { inventoryApi, medicinesApi, salesApi } from "../utils/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";

interface SaleItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface MedicineOption {
  id: string;
  name: string;
  genericName: string;
  category: string;
  price: number;
  status: "active" | "inactive";
}

interface InventoryBatch {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  batchNumber: string;
}

interface RecentSale {
  id: string;
  invoiceId: string;
  date: string;
  total: number;
  originalTotal: number;
  items: number;
  customerName: string;
  paymentMethod: string;
  isReturned: boolean;
  returnedAt: string | null;
}

export function Sales() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [searchMedicine, setSearchMedicine] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatch[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const [returningSaleId, setReturningSaleId] = useState<string | null>(null);
  const [showAllSales, setShowAllSales] = useState(false);

  useEffect(() => {
    void loadSalesData(false);
  }, []);

  const loadSalesData = async (includeAllSales: boolean = showAllSales) => {
    try {
      setLoading(true);
      const [medicinesResponse, inventoryResponse, salesResponse] = await Promise.all([
        medicinesApi.getAll(),
        inventoryApi.getAll(),
        salesApi.getAll({ all: includeAllSales }),
      ]);

      setMedicines(
        (medicinesResponse.data || [])
          .map((medicine: any) => ({
            id: String(medicine.id),
            name: String(medicine.name),
            genericName: String(medicine.genericName ?? medicine.generic_name ?? medicine.name ?? ""),
            category: String(medicine.category ?? ""),
            price: Number(medicine.price || 0),
            status: medicine.status === "inactive" ? "inactive" : "active",
          }))
          .filter((medicine: MedicineOption) => medicine.status === "active")
      );

      setInventoryBatches(
        (inventoryResponse.data || []).map((batch: any) => ({
          id: String(batch.id),
          medicineId: String(batch.medicineId),
          medicineName: String(batch.medicineName),
          quantity: Number(batch.quantity || 0),
          unitPrice: Number(batch.unitPrice || 0),
          batchNumber: String(batch.batchNumber || ""),
        }))
      );

      setRecentSales(
        (salesResponse.data || []).map((sale: any) => ({
          id: String(sale.id),
          invoiceId: String(sale.invoiceId ?? sale.invoiceid ?? `INV-${sale.id}`),
          date: String(sale.date ?? ""),
          total: Number(sale.total || 0),
          originalTotal: Number(sale.originalTotal ?? sale.original_total ?? sale.total ?? 0),
          items: Number(sale.items || 0),
          customerName: String(sale.customerName ?? sale.customer_name ?? "Walk-in Customer"),
          paymentMethod: String(sale.paymentMethod ?? sale.paymentmethod ?? "unknown"),
          isReturned: Boolean(sale.isReturned ?? sale.is_returned ?? false),
          returnedAt: sale.returnedAt ?? sale.returned_at ?? null,
        }))
      );
    } catch (error) {
      console.error("Error loading sales data:", error);
      alert("Failed to load sales data from backend.");
    } finally {
      setLoading(false);
    }
  };

  const medicineStockMap = useMemo(() => {
    const stockMap: Record<string, number> = {};

    for (const batch of inventoryBatches) {
      stockMap[batch.medicineId] = (stockMap[batch.medicineId] || 0) + batch.quantity;
    }

    return stockMap;
  }, [inventoryBatches]);

  const todaySummary = useMemo(() => {
    const today = new Date();
    const sameDaySales = recentSales.filter((sale) => {
      if (sale.isReturned) return false;
      const saleDate = new Date(sale.date);
      return (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
    });

    return {
      count: sameDaySales.length,
      total: sameDaySales.reduce((sum, sale) => sum + sale.total, 0),
    };
  }, [recentSales]);

  const addSaleItem = () => {
    setSaleItems((prev) => [
      ...prev,
      { medicineId: "", medicineName: "", quantity: 1, unitPrice: 0, discount: 0 },
    ]);
  };

  const removeSaleItem = (index: number) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSaleItem = (index: number, field: keyof SaleItem, value: any) => {
    setSaleItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const calculateItemTotal = (item: SaleItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (item.discount / 100);
    return subtotal - discountAmount;
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateDiscount = () => {
    return saleItems.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      return sum + subtotal * (item.discount / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleMedicineSelect = (index: number, medicineId: string) => {
    const medicine = medicines.find((m) => m.id === medicineId);
    if (!medicine) return;

    setSaleItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        medicineId,
        medicineName: medicine.name,
        unitPrice: medicine.price,
      };
      return newItems;
    });
  };

  const buildCheckoutItems = () => {
    const checkoutItems: Array<{ medicineId: number; batchId: number; quantity: number; price: number }> = [];

    for (const item of saleItems) {
      const targetBatches = inventoryBatches
        .filter((batch) => batch.medicineId === item.medicineId && batch.quantity > 0)
        .sort((a, b) => Number(a.id) - Number(b.id));

      let remainingQuantity = item.quantity;

      for (const batch of targetBatches) {
        if (remainingQuantity <= 0) break;

        const allocatedQty = Math.min(remainingQuantity, batch.quantity);
        if (allocatedQty <= 0) continue;

        checkoutItems.push({
          medicineId: Number(item.medicineId),
          batchId: Number(batch.id),
          quantity: allocatedQty,
          price: Number((item.unitPrice * (1 - item.discount / 100)).toFixed(2)),
        });

        remainingQuantity -= allocatedQty;
      }

      if (remainingQuantity > 0) {
        throw new Error(`Insufficient stock for ${item.medicineName || "selected medicine"}`);
      }
    }

    return checkoutItems;
  };

  const handleCheckout = async () => {
    const normalizedCustomerName = customerName.trim();
    if (!normalizedCustomerName) {
      alert("Enter customer name.");
      return;
    }

    if (!paymentMethod) {
      alert("Select a payment method.");
      return;
    }

    const validItems = saleItems.filter((item) => item.medicineId && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      alert("Add at least one valid sale item.");
      return;
    }

    try {
      setCheckoutLoading(true);

      const checkoutItems = buildCheckoutItems();
      const totalAmount = Number(calculateTotal().toFixed(2));

      const response = await salesApi.create({
        prescriptionId: null,
        customerName: normalizedCustomerName,
        paymentMethod,
        totalAmount,
        items: checkoutItems,
      });

      const saleId = response.data?.sale_id;
      const invoiceId = saleId ? `INV-${saleId}` : `INV-${Date.now()}`;

      downloadInvoicePdf({
        invoiceId,
        invoiceDate: formatDateTime(new Date()),
        customerName: normalizedCustomerName,
        paymentMethod,
        items: validItems.map((item) => ({
          medicineName: item.medicineName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discount,
          lineTotal: calculateItemTotal(item),
        })),
        subtotal: calculateSubtotal(),
        discountTotal: calculateDiscount(),
        grandTotal: calculateTotal(),
      });

      setSaleItems([]);
      setCustomerName("");
      setPaymentMethod("");

      await loadSalesData(showAllSales);
      window.dispatchEvent(new CustomEvent("pharmacy:data-updated", { detail: { source: "sales" } }));
    } catch (error: any) {
      console.error("Error processing sale:", error);
      alert(error?.message || "Failed to process sale.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleReturnSale = async (sale: RecentSale) => {
    if (sale.isReturned) {
      return;
    }

    const shouldReturn = window.confirm(
      `Return sale ${sale.invoiceId}? This will restore all medicines to their original batches and remove the sale amount from revenue totals.`
    );
    if (!shouldReturn) {
      return;
    }

    try {
      setReturningSaleId(sale.id);
      const response = await salesApi.returnSale(sale.id);
      const returnedAt = String(response.data?.returnedAt ?? response.data?.returned_at ?? new Date().toISOString());

      setRecentSales((prev) =>
        prev.map((currentSale) =>
          currentSale.id === sale.id
            ? {
                ...currentSale,
                total: 0,
                isReturned: true,
                returnedAt,
              }
            : currentSale
        )
      );

      await loadSalesData(showAllSales);
      window.dispatchEvent(new CustomEvent("pharmacy:data-updated", { detail: { source: "sales-return" } }));
    } catch (error: any) {
      console.error("Error returning sale:", error);
      alert(error?.message || "Failed to return this sale.");
    } finally {
      setReturningSaleId(null);
    }
  };

  const handleRecentSaleInvoice = async (sale: RecentSale) => {
    try {
      setInvoiceLoadingId(sale.id);
      const response = await salesApi.getById(sale.id);
      const saleData = response.data ?? {};
      const saleItems = Array.isArray(saleData.items) ? saleData.items : [];

      const normalizedItems = saleItems.map((item: any) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        return {
          medicineName: String(item.medicineName ?? item.medicinename ?? "Medicine"),
          quantity,
          unitPrice,
          discountPercent: 0,
          lineTotal: Number((quantity * unitPrice).toFixed(2)),
        };
      });

      const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + item.lineTotal, 0);
      const grandTotal = Number(saleData.total_amount ?? sale.total ?? subtotal);

      downloadInvoicePdf({
        invoiceId: sale.invoiceId,
        invoiceDate: formatDateTime(saleData.sale_date ?? sale.date),
        customerName: String(saleData.customer_name ?? sale.customerName ?? "Walk-in Customer"),
        paymentMethod: String(saleData.payment_method ?? sale.paymentMethod ?? "unknown"),
        items: normalizedItems,
        subtotal,
        discountTotal: 0,
        grandTotal,
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to generate invoice for this sale.");
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const medicineSearchResults = useMemo(() => {
    const query = searchMedicine.trim().toLowerCase();
    if (!query) return medicines;

    return medicines.filter((med) => {
      const nameMatch = med.name.toLowerCase().includes(query);
      const genericMatch = med.genericName.toLowerCase().includes(query);
      const categoryMatch = med.category.toLowerCase().includes(query);
      return nameMatch || genericMatch || categoryMatch;
    });
  }, [medicines, searchMedicine]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Sales & Billing</h1>
        <p className="text-gray-500 mt-1">Point of sale and invoice generation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New Sale</CardTitle>
                <Button size="sm" onClick={addSaleItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer Name</Label>
                    <Input
                      id="customer"
                      placeholder="Enter customer name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="mobile">Mobile Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {saleItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
                    No items in cart. Click "Add Item" to start a sale.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {saleItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-5 space-y-1">
                          <Label className="text-xs">Medicine</Label>
                          <Select value={item.medicineId} onValueChange={(value) => handleMedicineSelect(index, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select medicine" />
                            </SelectTrigger>
                            <SelectContent>
                              {medicines.map((med) => (
                                <SelectItem key={med.id} value={med.id}>
                                  {med.name} - {"\u20B9"} {med.price.toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.medicineId ? Math.max(1, medicineStockMap[item.medicineId] || 1) : undefined}
                            value={item.quantity || ""}
                            onChange={(e) => updateSaleItem(index, "quantity", parseInt(e.target.value, 10) || 1)}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Price</Label>
                          <Input value={`${"\u20B9"} ${item.unitPrice.toFixed(2)}`} disabled />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Disc %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount || ""}
                            onChange={(e) => updateSaleItem(index, "discount", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSaleItem(index)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {saleItems.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{"\u20B9"} {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-600">-{"\u20B9"} {calculateDiscount().toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="text-2xl">{"\u20B9"} {calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <Button variant="outline" onClick={() => setSaleItems([])}>
                      Clear
                    </Button>
                    <Button onClick={handleCheckout} disabled={checkoutLoading}>
                      {checkoutLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                      Generate Invoice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Today's Transactions</span>
                  <span>{todaySummary.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Today's Total</span>
                  <span>{"\u20B9"} {todaySummary.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{showAllSales ? "All Sales Loaded" : "Recent Sales Loaded"}</span>
                  <span>{recentSales.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Medicine Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search medicines..."
                    value={searchMedicine}
                    onChange={(e) => setSearchMedicine(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {medicineSearchResults.map((med) => (
                    <div
                      key={med.id}
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSaleItems((prev) => [
                          ...prev,
                          {
                            medicineId: med.id,
                            medicineName: med.name,
                            quantity: 1,
                            unitPrice: med.price,
                            discount: 0,
                          },
                        ]);
                      }}
                    >
                      <p className="text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {med.genericName}{med.category ? ` | ${med.category}` : ""}
                      </p>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{"\u20B9"} {med.price.toFixed(2)}</span>
                        <span>Stock: {medicineStockMap[med.id] || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{showAllSales ? "All Sales" : "Recent Sales"}</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextShowAll = !showAllSales;
                    setShowAllSales(nextShowAll);
                    void loadSalesData(nextShowAll);
                  }}
                  disabled={loading}
                >
                  {showAllSales ? "Show Recent" : "Show All"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading sales...</div>
              ) : recentSales.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No sales available.</div>
              ) : (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="w-full p-3 bg-gray-50 rounded-lg text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm">{sale.invoiceId}</p>
                            {sale.isReturned ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                                Returned
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{formatDateTime(sale.date)}</p>
                          <p className="text-xs text-gray-500">{sale.customerName}</p>
                          <p className="text-xs text-gray-500">{sale.paymentMethod}</p>
                          {sale.isReturned && sale.returnedAt ? (
                            <p className="text-xs text-amber-700 mt-1">
                              Returned on {formatDateTime(sale.returnedAt)}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          {sale.isReturned ? (
                            <>
                              <p className="text-sm text-gray-400 line-through">
                                {"\u20B9"} {sale.originalTotal.toFixed(2)}
                              </p>
                              <p className="text-xs text-amber-700">Net sale: {"\u20B9"} 0.00</p>
                            </>
                          ) : (
                            <p className="text-sm">{"\u20B9"} {sale.total.toFixed(2)}</p>
                          )}
                          <p className="text-xs text-gray-500">{sale.items} items</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRecentSaleInvoice(sale)}
                          disabled={invoiceLoadingId === sale.id || returningSaleId === sale.id}
                        >
                          {invoiceLoadingId === sale.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Preparing invoice...
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3" />
                              Download invoice
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant={sale.isReturned ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => void handleReturnSale(sale)}
                          disabled={sale.isReturned || returningSaleId === sale.id || invoiceLoadingId === sale.id}
                        >
                          {returningSaleId === sale.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Returning...
                            </>
                          ) : sale.isReturned ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Returned
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3 h-3" />
                              Return
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
