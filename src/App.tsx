import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { FirebaseProvider } from "@/contexts/FirebaseContext";
import AuthChecker from "@/components/AuthChecker";
import AdminLayout from "@/components/AdminLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ErrorPage from "./pages/ErrorPage";

// Artwork Pages
import PaintingsPage from "./pages/artworks/Paintings";
import SketchesPage from "./pages/artworks/Sketches";
import DigitalArtPage from "./pages/artworks/DigitalArt";
import MixedMediaPage from "./pages/artworks/MixedMedia";

// Collection Pages
import FeaturedCollectionsPage from "./pages/collections/FeaturedCollections";
import SeasonalCollectionsPage from "./pages/collections/SeasonalCollections";
import ThematicCollectionsPage from "./pages/collections/ThematicCollections";
import UserPage from "./pages/Users";
import ProductList from "./pages/Product";
import ProductCategories from "./pages/ProductCategories";
import Collections from "./pages/Collections";
import Artists from "./pages/Artists";
import WorkList from "./pages/Works";
import Coupons from "./pages/Coupons";
import BannerDisplay from "./pages/BannerDisplay";
import FAQDisplay from "./pages/FAQDisplay";
import OrdersDisplay from "./pages/OrderDisplay";
import ReviewsDisplay from "./pages/ReviewsDisplay";
import FilterDisplay from "./pages/FilterDisplay";

const queryClient = new QueryClient();

// Wrapper component to conditionally render AdminLayout
const AdminLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Don't apply admin layout to login page
  if (location.pathname === "/login") {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <FirebaseProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthChecker>
            <Routes>
              <Route
                path="/"
                element={
                  <AdminLayoutWrapper>
                    <Index />
                  </AdminLayoutWrapper>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <AdminLayoutWrapper>
                    <Dashboard />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/banner"
                element={
                  <AdminLayoutWrapper>
                    <BannerDisplay />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/reviews"
                element={
                  <AdminLayoutWrapper>
                    <ReviewsDisplay />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/orders"
                element={
                  <AdminLayoutWrapper>
                    <OrdersDisplay />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/faq-manager"
                element={
                  <AdminLayoutWrapper>
                    <FAQDisplay />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/users"
                element={
                  <AdminLayoutWrapper>
                    <UserPage />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/products"
                element={
                  <AdminLayoutWrapper>
                    <ProductList />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/works"
                element={
                  <AdminLayoutWrapper>
                    <WorkList />
                  </AdminLayoutWrapper>
                }
              />

              <Route
                path="/collections"
                element={
                  <AdminLayoutWrapper>
                    <Collections />
                  </AdminLayoutWrapper>
                }
              />

              <Route
                path="/artists"
                element={
                  <AdminLayoutWrapper>
                    <Artists />
                  </AdminLayoutWrapper>
                }
              />

              <Route
                path="/coupons"
                element={
                  <AdminLayoutWrapper>
                    <Coupons />
                  </AdminLayoutWrapper>
                }
              />

              <Route
                path="/filters"
                element={
                  <AdminLayoutWrapper>
                    <FilterDisplay />
                  </AdminLayoutWrapper>
                }
              />

              <Route
                path="/product-categories"
                element={
                  <AdminLayoutWrapper>
                    <ProductCategories />
                  </AdminLayoutWrapper>
                }
              />

              <Route
                path="/messages"
                element={
                  <AdminLayoutWrapper>
                    <Messages />
                  </AdminLayoutWrapper>
                }
              />

              {/* Artwork Routes */}
              <Route
                path="/artworks/paintings"
                element={
                  <AdminLayoutWrapper>
                    <PaintingsPage />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/artworks/sketches"
                element={
                  <AdminLayoutWrapper>
                    <SketchesPage />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/artworks/digital"
                element={
                  <AdminLayoutWrapper>
                    <DigitalArtPage />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/artworks/mixed-media"
                element={
                  <AdminLayoutWrapper>
                    <MixedMediaPage />
                  </AdminLayoutWrapper>
                }
              />

              {/* Collection Routes */}
              <Route
                path="/collections/featured"
                element={
                  <AdminLayoutWrapper>
                    <FeaturedCollectionsPage />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/collections/seasonal"
                element={
                  <AdminLayoutWrapper>
                    <SeasonalCollectionsPage />
                  </AdminLayoutWrapper>
                }
              />
              <Route
                path="/collections/thematic"
                element={
                  <AdminLayoutWrapper>
                    <ThematicCollectionsPage />
                  </AdminLayoutWrapper>
                }
              />

              {/* Events Route */}
              <Route
                path="/events"
                element={
                  <AdminLayoutWrapper>
                    <Dashboard />
                  </AdminLayoutWrapper>
                }
              />

              {/* Error routes */}
              <Route path="/error" element={<ErrorPage />} />
              <Route
                path="*"
                element={
                  <AdminLayoutWrapper>
                    <NotFound />
                  </AdminLayoutWrapper>
                }
              />
            </Routes>
          </AuthChecker>
        </BrowserRouter>
      </TooltipProvider>
    </FirebaseProvider>
  </QueryClientProvider>
);

export default App;
