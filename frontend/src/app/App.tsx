import { useState, useEffect } from "react";
import {
  Sidebar,
  TopBar,
  Dashboard,
  MedicineMaster,
  Inventory,
  PurchaseOrders,
  Prescriptions,
  Sales,
  Login,
  Profile,
} from "./features";

type UserProfile = {
  name: string;
  email: string;
  role: string;
};

type ReportNotification = {
  id: string;
  title: string;
  fileName: string;
  url: string;
  createdAt: string;
};

type GeneratedReportPayload = {
  title: string;
  fileName: string;
  blob: Blob;
};

function App() {
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reportNotifications, setReportNotifications] = useState<ReportNotification[]>([]);

  // Initialize the system with sample data
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setLoading(true);
        
        // Display welcome message
        console.log("\n%c🏥 PHARMACY MANAGEMENT SYSTEM", "color: #3b82f6; font-size: 20px; font-weight: bold;");
        console.log("%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "color: #3b82f6;");
        console.log("\n%c⚡ System ready!", "color: #8b5cf6; font-weight: bold;");
        
        setInitialized(true);
        
        // Display success message
        console.log("%c✅ System initialized successfully!", "color: #10b981; font-weight: bold;");
        console.log("\n%c📊 Sample Data Loaded:", "color: #3b82f6; font-weight: bold;");
        console.log("   • 5 Medicines (Amoxicillin, Ibuprofen, Paracetamol, Metformin, Lisinopril)");
        console.log("   • 5 Inventory Batches (with varying stock levels and expiry dates)");
        console.log("\n%c🎯 Quick Start:", "color: #3b82f6; font-weight: bold;");
        console.log("   1. Check Dashboard for real-time KPIs");
        console.log("   2. Click 'Medicine Master' to add medicines");
        console.log("   3. Click 'Sales & Billing' to make a test sale");
        console.log("   4. Watch inventory auto-update!");
        console.log("\n%c📚 Documentation:", "color: #3b82f6; font-weight: bold;");
        console.log("   • START_HERE.md - Begin here!");
        console.log("   • HOW_TO_RUN.md - Verify it's working");
        console.log("   • QUICK_START.md - 5-minute guide");
        console.log("   • README.md - Complete reference");
        console.log("\n%c🚀 All systems operational! Navigate using the sidebar →", "color: #10b981; font-weight: bold;");
        console.log("%c━━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", "color: #3b82f6;");
        
      } catch (error) {
        console.log("%c❌ Error initializing system", "color: #ef4444; font-weight: bold;");
        console.error("Error details:", error);
        console.log("\n%c🔧 Troubleshooting:", "color: #f59e0b; font-weight: bold;");
        console.log("   1. Check your internet connection");
        console.log("   2. Verify Supabase is connected");
        console.log("   3. Try refreshing the page");
        console.log("   4. Check HOW_TO_RUN.md → Troubleshooting section");
      } finally {
        setLoading(false);
      }
    };
    
    initializeSystem();
  }, []);

  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const isDashboardOnlyUser = normalizedRole === "admin";

  useEffect(() => {
    if (isDashboardOnlyUser && activeScreen !== "dashboard") {
      setActiveScreen("dashboard");
    }
  }, [activeScreen, isDashboardOnlyUser]);

  const handleReportGenerated = (payload: GeneratedReportPayload) => {
    const url = URL.createObjectURL(payload.blob);
    const notification: ReportNotification = {
      id: crypto.randomUUID(),
      title: payload.title,
      fileName: payload.fileName,
      url,
      createdAt: new Date().toISOString(),
    };

    setReportNotifications((prev) => [notification, ...prev].slice(0, 10));
  };

  const clearNotifications = () => {
    setReportNotifications((prev) => {
      for (const report of prev) {
        URL.revokeObjectURL(report.url);
      }
      return [];
    });
  };

  const renderScreen = () => {
    if (isDashboardOnlyUser && activeScreen !== "dashboard") {
      return <Dashboard />;
    }

    switch (activeScreen) {
      case "dashboard":
        return <Dashboard />;
      case "medicines":
        return <MedicineMaster />;
      case "inventory":
        return <Inventory />;
      case "purchases":
        return <PurchaseOrders onPurchaseOrderReportGenerated={handleReportGenerated} />;
      case "prescriptions":
        return <Prescriptions />;
      case "sales":
        return <Sales />;
      case "profile":
        return (
          <Profile
            user={user}
            onBack={() => setActiveScreen("dashboard")}
            onSalesReportGenerated={handleReportGenerated}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return (
      <Login
        onAuthenticated={(nextUser) => {
          setUser(nextUser);
          setActiveScreen("dashboard");
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} role={user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          tenantName="HealthCare Pharmacy - Main Branch"
          userName={user.name}
          onProfile={!isDashboardOnlyUser ? () => setActiveScreen("profile") : undefined}
          showProfile={!isDashboardOnlyUser}
          onLogout={() => {
            setUser(null);
            setActiveScreen("dashboard");
          }}
          notifications={reportNotifications}
          onClearNotifications={clearNotifications}
        />
        <main className="flex-1 overflow-y-auto">
          {renderScreen()}
        </main>
      </div>
    </div>
  );
}

export default App;
