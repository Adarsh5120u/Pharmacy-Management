import { LayoutDashboard, Pill, Package, ShoppingCart, FileText, DollarSign } from "lucide-react";
import { cn } from "./ui/utils";

interface SidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  role?: string;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "medicines", label: "Medicines", icon: Pill },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "purchases", label: "Purchases", icon: ShoppingCart },
  { id: "prescriptions", label: "Prescriptions", icon: FileText },
  { id: "sales", label: "Sales", icon: DollarSign },
];

export function Sidebar({ activeScreen, onNavigate, role }: SidebarProps) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const visibleMenuItems =
    normalizedRole === "admin"
      ? menuItems.filter((item) => item.id === "dashboard")
      : menuItems;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">MedXpert</h1>
            <p className="text-xs text-gray-500">Pharmacy Module</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
