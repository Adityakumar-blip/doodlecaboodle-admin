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
import { Trash2, Edit, Play } from "lucide-react";
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
import ReelModal from "@/views/ReelModal";

interface Reel {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
  productId: string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReelsDisplay: React.FC = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [originalReels, setOriginalReels] = useState<Reel[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Reorder logic ---
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = reels.findIndex((r) => r.id === active.id);
    const newIndex = reels.findIndex((r) => r.id === over.id);

    const newReels = [...reels];
    const [reorderedItem] = newReels.splice(oldIndex, 1);
    newReels.splice(newIndex, 0, reorderedItem);

    const updatedReels = newReels.map((reel, index) => ({
      ...reel,
      displayOrder: index + 1,
    }));

    setReels(updatedReels);
    setHasUnsavedChanges(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);
      reels.forEach((reel, index) => {
        const reelRef = doc(db, "reels", reel.id);
        batch.update(reelRef, {
          displayOrder: index + 1,
          updatedAt: new Date(),
        });
      });
      await batch.commit();
      setOriginalReels([...reels]);
      setHasUnsavedChanges(false);
      toast.success("Reels order saved successfully!");
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Failed to save Reels order");
    } finally {
      setSaving(false);
    }
  };

  const cancelReorder = () => {
    setReels([...originalReels]);
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

  const SortableReel: React.FC<{ reel: Reel; index: number }> = ({ reel, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: reel.id });
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
          <span className="cursor-grab"><Play className="h-5 w-5 text-gray-400" /></span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium">{reel.title}</div>
          </div>
          <div className="text-sm text-gray-500 truncate">{reel.caption}</div>
        </div>
        <div>
          {reel.videoUrl && (
            <video src={reel.videoUrl} className="w-16 h-16 object-cover rounded" autoPlay muted loop playsInline />
          )}
        </div>
        <div className="text-right text-xs text-gray-500">Order: {reel.displayOrder || index + 1}</div>
      </div>
    );
  };

  const ReorderList: React.FC = () => (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={reels.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {reels.map((reel, index) => (
            <SortableReel key={reel.id} reel={reel} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  // --- End reorder logic ---

  const fetchReels = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "reels"));
      const fetchedReels = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Reel[];

      const sortedReels = fetchedReels.sort((a, b) => {
        const orderA = a.displayOrder ?? 999999;
        const orderB = b.displayOrder ?? 999999;
        return orderA - orderB;
      });

      setReels(sortedReels);
      setOriginalReels([...sortedReels]);
    } catch (error) {
      console.error("Error fetching reels:", error);
      toast.error("Failed to fetch reels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const handleEdit = (reel: Reel) => {
    setEditingReel(reel);
    setDrawerOpen(true);
  };

  const handleDelete = async (reelId: string) => {
    try {
      await deleteDoc(doc(db, "reels", reelId));
      setReels((prev) => prev.filter((reel) => reel.id !== reelId));
      toast.success("Reel deleted successfully");
    } catch (error) {
      console.error("Error deleting reel:", error);
      toast.error("Failed to delete reel");
    }
  };

  const handleReelAdded = (newReel: Reel) => {
    if (editingReel) {
      setReels((prev) =>
        prev.map((reel) =>
          reel.id === editingReel.id
            ? { ...newReel, id: editingReel.id }
            : reel
        )
      );
    } else {
      setReels((prev) => [...prev, newReel]);
    }
    setEditingReel(null);
    setDrawerOpen(false);
    fetchReels(); // Refresh order etc.
  };

  const columns: DataTableColumn<Reel>[] = [
    {
      id: "video",
      header: "Video",
      cell: (item) => (
        <div>
          {item.videoUrl && (
            <video
              src={item.videoUrl}
              className="w-16 h-28 object-cover rounded shadow-md border"
              autoPlay
              muted
              loop
              playsInline
            />
          )}
        </div>
      ),
    },
    {
      id: "title",
      header: "Title",
      cell: (item) => <div className="font-semibold text-gray-800">{item.title}</div>,
      sortable: true,
    },
    {
      id: "caption",
      header: "Caption",
      cell: (item) => (
        <div className="max-w-xs truncate text-gray-600 text-xs" title={item.caption}>
          {item.caption}
        </div>
      ),
    },
    {
      id: "linkedProduct",
      header: "Linked Products",
      cell: (item) => {
        const productList = item.products || (item.productId ? [{
          id: item.productId,
          name: item.productName || "",
          price: item.productPrice || 0,
          image: item.productImage || ""
        }] : []);

        if (productList.length === 0) {
          return <span className="text-gray-400 text-xs">No products linked</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-3 overflow-hidden">
              {productList.slice(0, 3).map((p, idx) => (
                <img
                  key={p.id || idx}
                  src={p.image || "/placeholder.svg"}
                  alt={p.name}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover border bg-gray-100"
                />
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 truncate max-w-[140px]" title={productList.map(p => p.name).join(", ")}>
                {productList[0]?.name}
                {productList.length > 1 && ` (+${productList.length - 1} more)`}
              </div>
              <div className="text-[10px] text-gray-500 font-medium">
                {productList.length === 1 ? `₹${productList[0]?.price}` : `${productList.length} products tagged`}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "displayOrder",
      header: "Display Order",
      cell: (item) => <Badge variant="secondary">{item.displayOrder}</Badge>,
      sortable: true,
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
                  reel "{item.title}" and remove it from our servers.
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
          <div className="text-lg">Loading reels...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Reels Management</h1>
          <div className="mt-2">
            <Badge variant="default">Total: {reels.length}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {!isReorderMode ? (
            <>
              <Button variant="outline" onClick={() => setIsReorderMode(true)}>
                Reorder Reels
              </Button>
              <Button onClick={() => setDrawerOpen(true)}>Add Reel</Button>
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
          data={reels}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchable
          pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20] }}
          searchPlaceholder="Search reels by title or caption..."
        />
      )}

      <ReelModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onReelAdded={handleReelAdded}
        editingReel={editingReel}
      />
    </div>
  );
};

export default ReelsDisplay;
