import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useFirebase } from "@/contexts/FirebaseContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Image,
  FolderOpen,
  Calendar,
  MessageSquare,
  Bell,
  LogOut,
  Palette,
  Brush,
  FileImage,
  Images,
  Menu,
  Users,
  ShoppingCart,
  Users2,
  DamIcon,
  PinIcon,
  GiftIcon,
} from "lucide-react";

interface MainSidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  unreadCount?: number;
}

const MainSidebar = ({
  collapsed,
  setCollapsed,
  unreadCount = 0,
}: MainSidebarProps) => {
  const { user, adminUser, logOut, isAdmin, isSeller } = useFirebase();
  const location = useLocation();

  // Get user initials for avatar
  const userEmail = user?.email || "";
  const userName = adminUser?.name || "";
  const userInitials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : userEmail.substring(0, 2).toUpperCase();

  // Track open state of nested menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    artworks: true,
    collections: false,
    sellers: false,
  });

  const toggleMenu = (menuName: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const isActive = (path: string) => location.pathname === path;
  const isInPath = (path: string) => location.pathname.startsWith(path);

  // Define main navigation items
  const mainNavItems = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      showTo: true,
    },
    {
      to: "/messages",
      label: "Messages",
      icon: MessageSquare,
      showTo: isAdmin,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { to: "/users", label: "Users", icon: Users2, showTo: true },
    { to: "/artists", label: "Artists", icon: Users, showTo: true },
    {
      to: "/product-categories",
      label: "Product Categories",
      icon: DamIcon,
      showTo: true,
    },
    {
      to: "/products",
      label: "Products",
      icon: GiftIcon,
      showTo: true,
    },
    {
      to: "/collections",
      label: "Collections",
      icon: PinIcon,
      showTo: true,
    },
    { to: "/orders", label: "Orders", icon: ShoppingCart, showTo: true },
  ];

  // // Define artwork categories
  // const artworkCategories = [
  //   { to: "/artworks/paintings", label: "Paintings", icon: Palette },
  //   { to: "/artworks/sketches", label: "Sketches", icon: Brush },
  //   { to: "/artworks/digital", label: "Digital Art", icon: FileImage },
  //   { to: "/artworks/mixed-media", label: "Mixed Media", icon: Images },
  // ];

  // // Define collection categories
  // const collectionCategories = [
  //   { to: "/collections/featured", label: "Featured" },
  //   { to: "/collections/seasonal", label: "Seasonal" },
  //   { to: "/collections/thematic", label: "Thematic" },
  // ];

  return (
    <Sidebar
      className={`border-r border-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          {!collapsed && (
            <span className="font-bold text-xl text-artist-purple">
              DoodleCaboodle
            </span>
          )}
          <SidebarTrigger
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </div>
      </div>

      <SidebarContent className="h-[calc(100vh-theme(spacing.14))]">
        <SidebarGroup>
          <SidebarGroupLabel className={`${collapsed ? "sr-only" : ""}`}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems
                .filter((item) => item.showTo)
                .map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.to}
                        end={item.to === "/dashboard"}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-artist-purple text-white"
                              : "text-muted-foreground hover:bg-muted"
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {!collapsed && (
                          <>
                            <span className="flex-grow">{item.label}</span>
                            {item.badge !== undefined && (
                              <Badge className="bg-red-500 text-white">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                        {collapsed && item.badge !== undefined && (
                          <Badge className="absolute right-1 top-0 bg-red-500 text-white text-xs min-w-5 h-5 flex items-center justify-center rounded-full">
                            {item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <div className="flex items-center gap-3 rounded-md p-2">
            <Avatar className="h-8 w-8 border border-artist-purple">
              <AvatarFallback className="bg-artist-purple text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">
                    {adminUser?.name || user?.email}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {adminUser?.role === "admin" ? "Admin" : "Seller"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logOut}
                  className="ml-auto"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logOut}
                className="ml-auto"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default MainSidebar;
