import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2 } from "lucide-react";
import { salesApi } from "../utils/api";
import { formatDateTime } from "../utils/date";
import { Input } from "./ui/input";
import { createSalesReportPdfBlob, type SalesReportEntry } from "../utils/salesReportPdf";

type UserProfile = {
  name: string;
  email: string;
  role: string;
};

interface ProfileProps {
  user: UserProfile | null;
  onBack: () => void;
  onSalesReportGenerated: (payload: { title: string; fileName: string; blob: Blob }) => void;
}

export function Profile({ user, onBack, onSalesReportGenerated }: ProfileProps) {
  const [reportLoading, setReportLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleGenerateSalesReport = async () => {
    try {
      setReportLoading(true);
      if (!fromDate || !toDate) {
        alert("Please select both From and To dates.");
        return;
      }

      const from = new Date(`${fromDate}T00:00:00`);
      const to = new Date(`${toDate}T23:59:59.999`);
      if (from > to) {
        alert("From date cannot be later than To date.");
        return;
      }

      const response = await salesApi.getAll({ all: true });
      const sales = (response.data || []) as any[];
      const filteredSales = sales.filter((sale: any) => {
        const saleDate = new Date(String(sale.date ?? sale.sale_date ?? ""));
        if (Number.isNaN(saleDate.getTime())) return false;
        const isReturned = Boolean(sale.isReturned ?? sale.is_returned ?? false);
        return saleDate >= from && saleDate <= to && !isReturned;
      });

      const entries: SalesReportEntry[] = filteredSales.map((sale: any) => ({
        invoiceId: String(sale.invoiceId ?? sale.invoiceid ?? `INV-${sale.id}`),
        date: String(sale.date ?? sale.sale_date ?? ""),
        paymentMethod: String(sale.paymentMethod ?? sale.paymentmethod ?? "unknown"),
        total: Number(sale.total ?? sale.total_amount ?? 0),
        items: Number(sale.items ?? 0),
      }));

      if (entries.length === 0) {
        alert("No sales found in the selected date range.");
        return;
      }

      const detailedSales = await Promise.all(
        filteredSales.map((sale: any) => salesApi.getById(String(sale.id)))
      );

      const medicineTotals = new Map<string, number>();
      for (const saleDetail of detailedSales) {
        const items = Array.isArray(saleDetail.data?.items) ? saleDetail.data.items : [];
        for (const item of items) {
          const name = String(item.medicineName ?? item.medicinename ?? "Unknown medicine");
          const qty = Number(item.quantity || 0);
          medicineTotals.set(name, (medicineTotals.get(name) || 0) + qty);
        }
      }

      const medicineSummary = Array.from(medicineTotals.entries())
        .map(([medicineName, quantity]) => ({ medicineName, quantity }))
        .sort((a, b) => b.quantity - a.quantity);

      const now = new Date();
      const safeTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      const fileName = `sales-report-${safeTimestamp}.pdf`;

      const blob = createSalesReportPdfBlob({
        generatedAt: formatDateTime(now),
        periodLabel: `${fromDate} to ${toDate}`,
        entries,
        medicineSummary,
      });

      onSalesReportGenerated({
        title: "Sales report ready",
        fileName,
        blob,
      });

      alert("Sales report generated. Download it from the notification icon.");
    } catch (error) {
      console.error("Error generating sales report:", error);
      alert("Failed to generate sales report.");
    } finally {
      setReportLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">No profile data available.</p>
        <Button className="mt-4" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-base font-medium text-gray-900">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-medium text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="text-base font-medium text-gray-900">{user.role}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">From Date</p>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">To Date</p>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => void handleGenerateSalesReport()} disabled={reportLoading}>
            {reportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Generate Sales Report PDF
          </Button>
          <Button onClick={onBack}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}
