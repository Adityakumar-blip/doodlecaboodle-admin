import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Trash2, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import BannerModal from "@/views/BannerModal";

interface Banner {
  id: string;
  title: string;
  description: string;
  image: { url: string; type: string }[];
  createdAt?: Date;
  updatedAt?: Date;
  mobileImage?: string;
}

const BannerDisplay: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "banners"));
      const fetchedBanners = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Banner[];
      setBanners(fetchedBanners);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Failed to fetch banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setDrawerOpen(true);
  };

  const handleDelete = async (bannerId: string) => {
    try {
      await deleteDoc(doc(db, "banners", bannerId));
      setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
      toast.success("Banner deleted successfully");
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Failed to delete banner");
    }
  };

  const handleBannerAdded = (newBanner: Banner) => {
    if (editingBanner) {
      setBanners((prev) =>
        prev.map((banner) =>
          banner.id === editingBanner.id
            ? { ...newBanner, id: editingBanner.id }
            : banner
        )
      );
      toast.success("Banner updated successfully");
    } else {
      setBanners((prev) => [...prev, newBanner]);
      toast.success("Banner added successfully");
    }
    setEditingBanner(null);
    setDrawerOpen(false);
  };

  const columns: DataTableColumn<Banner>[] = [
    {
      id: "image",
      header: "Image",
      cell: (item) => (
        <div>
          {item.mobileImage && (
            <img
              src={item.mobileImage}
              alt={item.title}
              className="w-16 h-16 object-cover rounded"
            />
          )}
        </div>
      ),
    },
    {
      id: "title",
      header: "Title",
      cell: (item) => <div className="font-medium">{item.title}</div>,
      sortable: true,
    },
    {
      id: "description",
      header: "Description",
      cell: (item) => (
        <div className="max-w-xs truncate" title={item.description}>
          {item.description}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  banner "{item.title}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading banners...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Banner Management</h1>
          <div className="mt-2">
            <Badge variant="default">Total: {banners.length}</Badge>
          </div>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>Add Banner</Button>
      </div>

      <DataTable
        data={banners}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20] }}
        searchPlaceholder="Search banners by title or description..."
      />

      <BannerModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onBannerAdded={handleBannerAdded}
        editingBanner={editingBanner}
      />
    </div>
  );
};

export default BannerDisplay;
