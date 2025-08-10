import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import WorkModal from "./WorkModal";
import { Pencil, GripVertical, Save, X } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  categoryId: string;
  subcategoryId?: string;
  artistId: string;
  artistName: string;
  orderType: string;
  tags: string[];
  displayOrder?: number;
  dimensions: {
    name: string;
    length: number;
    width: number;
    height?: number;
    unit: string;
    priceAdjustment: number;
  }[];
  materials: string[];
  weight?: number;
  images: { url: string; type: string }[];
  status: string;
  isCustomizable: boolean;
  customizationOptions?: {
    allowSizeCustomization: boolean;
    allowColorCustomization: boolean;
    allowStyleCustomization: boolean;
    customizationInstructions: string;
    deliveryTimeframe: string;
    availableSizes?: {
      name: string;
      length: number;
      width: number;
      height?: number;
      unit: string;
      priceAdjustment: number;
    }[];
  };
}

const WorkList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "ourworks"));
      const fetchedProducts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      const sortedProducts = fetchedProducts.sort((a, b) => {
        const orderA = a.displayOrder ?? 999999;
        const orderB = b.displayOrder ?? 999999;
        return orderA - orderB;
      });

      setProducts(sortedProducts);
      setOriginalProducts([...sortedProducts]);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = (newProduct: Product) => {
    const maxOrder = Math.max(...products.map((p) => p.displayOrder || 0), 0);
    const productWithOrder = { ...newProduct, displayOrder: maxOrder + 1 };
    setProducts((prev) => [...prev, productWithOrder]);
    setOriginalProducts((prev) => [...prev, productWithOrder]);
    setDrawerOpen(false);
    setEditingProduct(null);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const productRef = doc(db, "ourworks", updatedProduct.id);
      await updateDoc(productRef, {
        ...updatedProduct,
        updatedAt: new Date(),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
      setOriginalProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
      toast.success("Product updated successfully!");
      setDrawerOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "ourworks", productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setOriginalProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);

    const newProducts = [...products];
    const [reorderedItem] = newProducts.splice(oldIndex, 1);
    newProducts.splice(newIndex, 0, reorderedItem);

    const updatedProducts = newProducts.map((product, index) => ({
      ...product,
      displayOrder: index + 1,
    }));

    setProducts(updatedProducts);
    setHasUnsavedChanges(true);
  };

  const handleDisplayOrderChange = (productId: string, value: string) => {
    const newOrder = parseInt(value);
    if (isNaN(newOrder) || newOrder < 1 || newOrder > products.length) return;

    const productIndex = products.findIndex((p) => p.id === productId);
    if (productIndex === -1) return;

    const newProducts = [...products];
    const [movedProduct] = newProducts.splice(productIndex, 1);
    newProducts.splice(newOrder - 1, 0, movedProduct);

    const updatedProducts = newProducts.map((product, index) => ({
      ...product,
      displayOrder: index + 1,
    }));

    setProducts(updatedProducts);
    setHasUnsavedChanges(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);

      products.forEach((product, index) => {
        const productRef = doc(db, "ourworks", product.id);
        batch.update(productRef, {
          displayOrder: index + 1,
          updatedAt: new Date(),
        });
      });

      await batch.commit();
      setOriginalProducts([...products]);
      setHasUnsavedChanges(false);
      toast.success("Product order saved successfully!");
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Failed to save product order");
    } finally {
      setSaving(false);
    }
  };

  const cancelReorder = () => {
    setProducts([...originalProducts]);
    setHasUnsavedChanges(false);
    setIsReorderMode(false);
  };

  const enterReorderMode = () => {
    setOriginalProducts([...products]);
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

  const regularColumns: DataTableColumn<Product>[] = [
    {
      id: "displayOrder",
      header: "Order",
      cell: (item) => item.displayOrder || "N/A",
    },
    { id: "name", header: "Name", cell: (item) => item.name, sortable: true },
    {
      id: "description",
      header: "Description",
      cell: (item) => item.description,
    },
    {
      id: "price",
      header: "Price",
      cell: (item) => `₹${item.price}`,
      sortable: true,
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (item) => item.quantity || "N/A",
    },
    { id: "category", header: "Category", cell: (item) => item.category },
    {
      id: "actions",
      header: "Actions",
      cell: (item: Product) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditProduct(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteProduct(item.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const SortableItem: React.FC<{ product: Product; index: number }> = ({
    product,
    index,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: product.id });

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
          <GripVertical className="h-5 w-5 text-gray-400" />
          <div className="flex items-center gap-2">
            {/* <span className="text-sm font-medium text-gray-500">Order:</span> */}
            {/* <Input
              type="number"
              value={product.displayOrder || index + 1}
              onChange={(e) =>
                handleDisplayOrderChange(product.id, e.target.value)
              }
              className="w-20 text-center"
              min="1"
              max={products.length.toString()}
              onClick={(e) => e.stopPropagation()}
            /> */}
          </div>
        </div>

        <div className="flex-1">
          <div className="font-medium">{product.name}</div>
          <div className="text-sm text-gray-500 truncate">
            {product.description}
          </div>
        </div>

        <div className="text-right">
          <div className="font-medium">₹{product.price}</div>
          <div className="text-sm text-gray-500">{product.category}</div>
        </div>
      </div>
    );
  };

  const ReorderList: React.FC = () => (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={products.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {products.map((product, index) => (
            <SortableItem key={product.id} product={product} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">All Works</h1>
        <div className="flex gap-2">
          {!isReorderMode ? (
            <>
              <Button variant="outline" onClick={enterReorderMode}>
                Reorder Products
              </Button>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setDrawerOpen(true);
                }}
              >
                Add Works
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
                Drag products to reorder or change the order number directly.
                {hasUnsavedChanges && (
                  <span className="text-orange-600 ml-1">
                    You have unsaved changes.
                  </span>
                )}
              </p>
            </div>
            <div className="text-sm text-blue-600">
              Total Products: {products.length}
            </div>
          </div>
        </div>
      )}

      {isReorderMode ? (
        <ReorderList />
      ) : (
        <DataTable
          data={products}
          columns={regularColumns}
          keyExtractor={(item) => item.id}
          searchable
          pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20, 50] }}
        />
      )}

      <WorkModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onProductAdded={editingProduct ? handleUpdateProduct : handleAddProduct}
        editingProduct={editingProduct}
      />
    </div>
  );
};

export default WorkList;
