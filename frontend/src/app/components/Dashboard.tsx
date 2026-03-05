import { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, TrendingUp, Package, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { dashboardApi, inventoryApi, prescriptionsApi } from "../utils/api";
import { formatDate } from "../utils/date";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

export function Dashboard() {
  const [stats, setStats] = useState<any>({
    lowStockItems: 0,
    expiringMedicines: 0,
    expiredItems: 0,
    dailySales: 0,
    pendingPrescriptions: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [expiredItems, setExpiredItems] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<Array<{ month: string; sales: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(loadDashboardData, 30000);
    const onDataUpdated = () => {
      loadDashboardData();
    };
    window.addEventListener("pharmacy:data-updated", onDataUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pharmacy:data-updated", onDataUpdated);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, inventoryResponse, analyticsResponse, prescriptionsResponse] = await Promise.all([
        dashboardApi.getStats(),
        inventoryApi.getAll(),
        dashboardApi.getSalesAnalytics(),
        prescriptionsApi.getAll(),
      ]);

      const pendingRx = (prescriptionsResponse.data || []).filter((rx: any) => {
        const status = String(rx.status || "").trim().toLowerCase();
        return status === "pending" || status === "partially-fulfilled" || status === "partially fulfilled";
      });
      const pendingFromStats = Number(statsResponse.data?.pendingPrescriptions || 0);
      const pendingCount = Math.max(pendingFromStats, pendingRx.length);
      setStats({
        ...statsResponse.data,
        pendingPrescriptions: pendingCount,
      });
      setSalesData(analyticsResponse.data?.salesTrend || []);
      setCategoryData(analyticsResponse.data?.salesByCategory || []);

      // Calculate low stock items
      const LOW_STOCK_THRESHOLD = 100;
      const lowStock = inventoryResponse.data.filter(
        (item: any) => {
          const level = item.reorderLevel && item.reorderLevel > 0 ? item.reorderLevel : LOW_STOCK_THRESHOLD;
          return item.quantity < level;
        }
      );
      setLowStockItems(lowStock);

      // Calculate expiring items (within 30 days) and already expired
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiring = inventoryResponse.data.filter((item: any) => {
        if (item.expiryDate) {
          const expiryDate = new Date(item.expiryDate);
          return expiryDate <= thirtyDaysFromNow && expiryDate > today;
        }
        return false;
      });
      const expired = inventoryResponse.data.filter((item: any) => {
        if (item.expiryDate) {
          const expiryDate = new Date(item.expiryDate);
          return expiryDate <= today;
        }
        return false;
      });
      setExpiringItems(expiring);
      setExpiredItems(expired);

      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of pharmacy operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Low Stock Alerts</CardTitle>
            <Package className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.lowStockItems}</div>
            <p className="text-xs text-gray-500 mt-1">Items need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Expiring Soon</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.expiringMedicines}</div>
            <p className="text-xs text-gray-500 mt-1">Within 60 days</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-red-600">Expired Items</CardTitle>
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600 font-extrabold animate-pulse">
              {expiredItems.length || stats.expiredItems || 0}
            </div>
            <p className="text-xs text-red-500 mt-1">Already expired</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Today's Sales</CardTitle>
            <DollarSign className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₹ {stats.dailySales?.toFixed(2) || '0.00'}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <p className="text-xs text-green-600">{stats.todaySalesCount || 0} transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-500">Prescriptions</CardTitle>
            <Calendar className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.pendingPrescriptions || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Pending fulfillment</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No low stock alerts</p>
              ) : (
                lowStockItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm">{item.medicineName || item.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {item.quantity} | Min: {item.reorderLevel}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Critical
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring Medicines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringItems.length + expiredItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No expiring or expired medicines</p>
              ) : (
                [...expiredItems, ...expiringItems].map((item, index) => {
                  const isExpired = item.expiryDate && new Date(item.expiryDate) <= new Date();
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${isExpired ? 'bg-red-100 border-l-red-600' : 'bg-yellow-50 border-l-yellow-500'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${isExpired ? 'text-red-700' : 'text-gray-900'}`}>
                            {item.medicineName || item.name}
                          </p>
                          {isExpired && (
                            <Badge className="bg-red-600 text-xs animate-pulse">EXPIRED</Badge>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                          Batch: {item.batchNumber} | Stock: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}>
                          {isExpired ? "EXPIRED" : "Expires"}
                        </p>
                        <p className={`text-sm font-bold ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>
                          {formatDate(item.expiryDate)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

