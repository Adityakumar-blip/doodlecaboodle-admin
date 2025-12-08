import React, { useEffect, useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  desktopImage?: string;
  displayOrder?: number;
}

const BannerDisplay: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [originalBanners, setOriginalBanners] = useState<Banner[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Reorder logic ---
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);

    const newBanners = [...banners];
    const [reorderedItem] = newBanners.splice(oldIndex, 1);
    newBanners.splice(newIndex, 0, reorderedItem);

    const updatedBanners = newBanners.map((banner, index) => ({
      ...banner,
      displayOrder: index + 1,
    }));

    setBanners(updatedBanners);
    setHasUnsavedChanges(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);
      banners.forEach((banner, index) => {
        const bannerRef = doc(db, "banners", banner.id);
        batch.update(bannerRef, {
          displayOrder: index + 1,
          updatedAt: new Date(),
        });
      });
      await batch.commit();
      setOriginalBanners([...banners]);
      setHasUnsavedChanges(false);
      toast.success("Banner order saved successfully!");
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Failed to save banner order");
    } finally {
      setSaving(false);
    }
  };

  const cancelReorder = () => {
    setBanners([...originalBanners]);
    setHasUnsavedChanges(false);
    setIsReorderMode(false);
  };

  function exitReorderMode() {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Discard changes and exit?")) {
        cancelReorder();
      }
      return;
    }
    setIsReorderMode(false);
  }

  const SortableBanner: React.FC<{ banner: Banner; index: number }> = ({ banner, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: banner.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      scale: isDragging ? 0.95 : 1,
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-4 p-4 bg-white border rounded-lg transition-all border-gray-200 hover:shadow-md"
      >
        <div className="flex items-center gap-2">
          <span className="cursor-grab"><Edit className="h-5 w-5 text-gray-400" /></span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium">{banner.title}</div>
          </div>
          <div className="text-sm text-gray-500 truncate">{banner.description}</div>
        </div>
        <div>
          {banner.mobileImage && (
            <img src={banner.mobileImage} alt={banner.title} className="w-16 h-16 object-cover rounded" />
          )}
        </div>
        <div className="text-right text-xs text-gray-500">Order: {banner.displayOrder || index + 1}</div>
      </div>
    );
  };

  const ReorderList: React.FC = () => (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {banners.map((banner, index) => (
            <SortableBanner key={banner.id} banner={banner} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  // --- End reorder logic ---
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
      // Sort by displayOrder if present
      const sortedBanners = fetchedBanners.sort((a, b) => {
        const orderA = a.displayOrder ?? 999999;
        const orderB = b.displayOrder ?? 999999;
        return orderA - orderB;
      });
      setBanners(sortedBanners);
      setOriginalBanners([...sortedBanners]);
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
        <div className="flex gap-2">
          {!isReorderMode ? (
            <>
              <Button variant="outline" onClick={() => setIsReorderMode(true)}>
                Reorder Banners
              </Button>
              <Button onClick={() => setDrawerOpen(true)}>Add Banner</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={exitReorderMode}>
                <span className="mr-2">✖</span>Cancel
              </Button>
              <Button
                onClick={saveOrder}
                disabled={!hasUnsavedChanges || saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                <span className="mr-2">💾</span>{saving ? "Saving..." : "Save Order"}
              </Button>
            </>
          )}
        </div>
      </div>

      {isReorderMode ? (
        <ReorderList />
      ) : (
        <DataTable
          data={banners}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchable
          pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20] }}
          searchPlaceholder="Search banners by title or description..."
        />
      )}

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
