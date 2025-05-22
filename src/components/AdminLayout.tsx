
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFirebase } from "@/contexts/FirebaseContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useToast } from "@/components/ui/use-toast";
import { getUnreadMessages } from "@/lib/firebaseService";
import MainSidebar from "./MainSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user } = useFirebase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const unreadMessages = await getUnreadMessages();
        setUnreadCount(unreadMessages.length);
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
    };
    
    fetchUnreadMessages();
    
    // Poll for new messages every minute
    const interval = setInterval(fetchUnreadMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <MainSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
