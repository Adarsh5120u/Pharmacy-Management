import { Bell, Download, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface TopBarProps {
  tenantName: string;
  userName: string;
  onProfile?: () => void;
  onLogout: () => void;
  showProfile?: boolean;
  notifications: Array<{
    id: string;
    title: string;
    fileName: string;
    url: string;
    createdAt: string;
  }>;
  onClearNotifications: () => void;
}

export function TopBar({
  tenantName,
  userName,
  onProfile,
  onLogout,
  showProfile = true,
  notifications,
  onClearNotifications,
}: TopBarProps) {
  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-sm text-gray-500">{tenantName}</h2>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 ? (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] bg-red-500 text-white rounded-full inline-flex items-center justify-center">
                  {notifications.length}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem disabled>No downloads available</DropdownMenuItem>
            ) : (
              notifications.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => handleDownload(item.url, item.fileName)}>
                  <Download className="w-4 h-4 mr-2 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.fileName}</p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearNotifications} disabled={notifications.length === 0}>
              Clear notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-700" />
              </div>
              <span>{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {showProfile && onProfile ? (
              <>
                <DropdownMenuItem onClick={onProfile}>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem className="text-red-600" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
