import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import ProductCategoriesModal from "@/views/ProductCategoriesModal";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Eye, Pencil, Trash2, GripVertical, Save, X } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  showInMenu: boolean;
  isFeatured: boolean;
  displayOrder?: number;
};

export default function ProductCategories() {
  const [categories, setCategories] = useState<Product[]>([]);
  const [originalCategories, setOriginalCategories] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Product | null>(
    null
  );
  const [modalMode, setModalMode] = useState<"view" | "edit" | "add">("add");
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch categories from Firestore
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productCategories"));
      const fetchedCategories = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      console.log("fetched categories", fetchedCategories);
      // sort by displayOrder if available
      const sorted = fetchedCategories.sort((a, b) => {
        const orderA = a.displayOrder ?? 999999;
        const orderB = b.displayOrder ?? 999999;
        return orderA - orderB;
      });
      setCategories(sorted);
      setOriginalCategories([...sorted]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "productCategories", id));
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Reorder handlers
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((p) => p.id === active.id);
    const newIndex = categories.findIndex((p) => p.id === over.id);

    const newCategories = [...categories];
    const [reorderedItem] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, reorderedItem);

    const updated = newCategories.map((c, index) => ({
      ...c,
      displayOrder: index + 1,
    }));

    setCategories(updated);
    setHasUnsavedChanges(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);

      categories.forEach((cat, index) => {
        const ref = doc(db, "productCategories", cat.id);
        batch.update(ref, { displayOrder: index + 1, updatedAt: new Date() });
      });

      await batch.commit();
      setOriginalCategories([...categories]);
      setHasUnsavedChanges(false);
      toast.success("Category order saved successfully!");
    } catch (error) {
      console.error("Error saving category order:", error);
      toast.error("Failed to save category order");
    } finally {
      setSaving(false);
    }
  };

  const cancelReorder = () => {
    setCategories([...originalCategories]);
    setHasUnsavedChanges(false);
    setIsReorderMode(false);
  };

  const enterReorderMode = () => {
    setOriginalCategories([...categories]);
    setIsReorderMode(true);
  };

  const exitReorderMode = () => {
    if (hasUnsavedChanges) {
      if (
        window.confirm("You have unsaved changes. Discard changes and exit?")
      ) {
        cancelReorder();
      }
      return;
    }
    setIsReorderMode(false);
  };

  const columns: DataTableColumn<Product>[] = [
    {
      id: "displayOrder",
      header: "Order",
      cell: (item) => item.displayOrder || "N/A",
    },
    { id: "name", header: "Name", cell: (item) => item.name, sortable: true },
    { id: "slug", header: "Slug", cell: (item) => item.slug },
    {
      id: "description",
      header: "Description",
      cell: (item) => (
        <div className="max-w-xs truncate">{item.description}</div>
      ),
    },
    {
      id: "isActive",
      header: "Active",
      cell: (item) => (item.isActive ? "Yes" : "No"),
    },
    {
      id: "showInMenu",
      header: "In Menu",
      cell: (item) => (item.showInMenu ? "Yes" : "No"),
    },
    {
      id: "isFeatured",
      header: "Featured",
      cell: (item) => (item.isFeatured ? "Yes" : "No"),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory(item);
              setModalMode("view");
              setDrawerOpen(true);
            }}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory(item);
              setModalMode("edit");
              setDrawerOpen(true);
            }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(item.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  // Sortable Item for categories
  const SortableItem: React.FC<{ category: Product; index: number }> = ({
    category,
    index,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-4 p-3 bg-white border rounded-lg transition-all border-gray-200 hover:shadow-md"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>

        <div className="flex-1">
          <div className="font-medium">{category.name}</div>
          <div className="text-sm text-gray-500 truncate">
            {category.description}
          </div>
        </div>

        <div className="text-right text-sm text-gray-500">
          Order: {category.displayOrder || index + 1}
        </div>
      </div>
    );
  };

  const ReorderList: React.FC = () => (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={categories.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {categories.map((category, index) => (
            <SortableItem key={category.id} category={category} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">All Product Categories</h1>

        <div className="flex gap-2">
          {!isReorderMode ? (
            <>
              <Button variant="outline" onClick={enterReorderMode}>
                Reorder Categories
              </Button>
              <Button
                onClick={() => {
                  setSelectedCategory(null);
                  setModalMode("add");
                  setDrawerOpen(true);
                }}
              >
                Add Category
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={exitReorderMode}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={saveOrder}
                disabled={!hasUnsavedChanges || saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Order"}
              </Button>
            </>
          )}
        </div>
      </div>

      {isReorderMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Reorder Mode Active
              </p>
              <p className="text-xs text-blue-600">
                Drag categories to reorder them in the list.
                {hasUnsavedChanges && (
                  <span className="text-orange-600 ml-1">
                    You have unsaved changes.
                  </span>
                )}
              </p>
            </div>
            <div className="text-sm text-blue-600">
              Total Categories: {categories.length}
            </div>
          </div>
        </div>
      )}

      {isReorderMode ? (
        <ReorderList />
      ) : (
        <DataTable
          data={categories}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchable
          pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 20] }}
        />
      )}

      <ProductCategoriesModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        selectedCategory={selectedCategory}
        mode={modalMode}
        onSaveSuccess={fetchCategories}
      />
    </div>
  );
}
