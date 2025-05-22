
import { useFirebase } from "@/contexts/FirebaseContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Loader } from "lucide-react";

interface AuthCheckerProps {
  children: React.ReactNode;
}

const AuthChecker = ({ children }: AuthCheckerProps) => {
  const { user, loading } = useFirebase();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      // Not on login page but no user, redirect to login
      if (!user && location.pathname !== "/login") {
        navigate("/login", { replace: true });
      } 
      // On login page with user, redirect to dashboard
      else if (user && location.pathname === "/login") {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-12 w-12 text-artist-purple animate-spin" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // For login page, we always render children
  if (location.pathname === "/login") {
    return <>{children}</>;
  }

  // For other pages, only render if authenticated
  return user ? <>{children}</> : null;
};

export default AuthChecker;
