import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Save,
  X,
  Filter,
} from "lucide-react";
import ProductModal from "@/views/ProductModal";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
  categoryName?: string;
  displayOrder?: number;
};

const initialProducts: Product[] = [
  {
    id: "1",
    name: "Wireless Mouse",
    description: "A smooth and responsive mouse",
    price: 899,
    quantity: 120,
    category: "Electronics",
    status: "active",
    displayOrder: 1,
  },
  {
    id: "2",
    name: "Notebook",
    description: "200-page ruled notebook",
    price: 49,
    quantity: 500,
    category: "Stationery",
    status: "active",
    displayOrder: 2,
  },
];

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [originalProducts, setOriginalProducts] =
    useState<Product[]>(initialProducts);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const fetchedProducts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Product[];

      // Sort products by displayOrder
      const sortedProducts = fetchedProducts.sort((a, b) => {
        const orderA = a.displayOrder ?? 999999;
        const orderB = b.displayOrder ?? 999999;
        return orderA - orderB;
      });

      setProducts(sortedProducts);
      setOriginalProducts([...sortedProducts]);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      setProducts((prev) => prev.filter((product) => product.id !== productId));
      setOriginalProducts((prev) =>
        prev.filter((product) => product.id !== productId),
      );
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleStatusToggle = async (
    productId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      await updateDoc(doc(db, "products", productId), {
        status: newStatus,
        updatedAt: new Date(),
      });

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? { ...product, status: newStatus as "active" | "inactive" }
            : product,
        ),
      );

      toast.success(
        `Product ${
          newStatus === "active" ? "activated" : "deactivated"
        } successfully`,
      );
    } catch (error) {
      console.error("Error updating product status:", error);
      toast.error("Failed to update product status");
    }
  };

  const handleProductAdded = (newProduct: Product) => {
    if (editingProduct) {
      // Update existing product
      const updatedProduct = { ...newProduct, id: editingProduct.id };
      setProducts((prev) =>
        prev.map((product) =>
          product.id === editingProduct.id ? updatedProduct : product,
        ),
      );
      setOriginalProducts((prev) =>
        prev.map((product) =>
          product.id === editingProduct.id ? updatedProduct : product,
        ),
      );
      toast.success("Product updated successfully");
    } else {
      // Add new product with highest display order
      const maxOrder = Math.max(...products.map((p) => p.displayOrder || 0), 0);
      const productWithOrder = { ...newProduct, displayOrder: maxOrder + 1 };
      setProducts((prev) => [...prev, productWithOrder]);
      setOriginalProducts((prev) => [...prev, productWithOrder]);
      toast.success("Product added successfully");
    }
    setEditingProduct(null);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingProduct(null);
  };

  // Reorder functionality
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

  const saveOrder = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);

      products.forEach((product, index) => {
        const productRef = doc(db, "products", product.id);
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

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      products.map((p) => p.categoryName || p.category).filter(Boolean),
    );
    return Array.from(categories).sort();
  }, [products]);

  // Filter products based on selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") {
      return products;
    }
    return products.filter(
      (p) =>
        p.categoryName === selectedCategory || p.category === selectedCategory,
    );
  }, [products, selectedCategory]);

  // Sortable Item Component for Reorder Mode
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
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium">{product.name}</div>
            <Badge
              variant={product.status === "active" ? "default" : "secondary"}
            >
              {product.status === "active" ? (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Inactive
                </>
              )}
            </Badge>
          </div>
          <div className="text-sm text-gray-500 truncate">
            {product.description}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{product.categoryName}</Badge>
            <span className="text-xs text-gray-400">
              Qty: {product.quantity}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="font-medium">₹{product.price.toLocaleString()}</div>
          <div className="text-sm text-gray-500">
            Order: {product.displayOrder || index + 1}
          </div>
        </div>
      </div>
    );
  };

  // Reorder List Component
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

  // Regular columns for data table
  const columns: DataTableColumn<Product>[] = [
    {
      id: "displayOrder",
      header: "Order",
      cell: (item) => item.displayOrder || "N/A",
    },
    {
      id: "name",
      header: "Name",
      cell: (item) => <div className="font-medium">{item.name}</div>,
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
      id: "price",
      header: "Price",
      cell: (item) => (
        <div className="font-semibold">₹{item.price.toLocaleString()}</div>
      ),
      sortable: true,
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (item) => (
        <div
          className={`${
            item.quantity <= 10 ? "text-red-600 font-semibold" : ""
          }`}
        >
          {item.quantity}
          {item.quantity === 0 && (
            <span className="text-xs block">Out of Stock</span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: "category",
      header: "Category",
      cell: (item) => <Badge variant="outline">{item.categoryName}</Badge>,
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <Badge variant={item.status === "active" ? "default" : "secondary"}>
            {item.status === "active" ? (
              <>
                <Eye className="w-3 h-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
          <Switch
            checked={item.status === "active"}
            onCheckedChange={() => handleStatusToggle(item.id, item.status)}
          />
        </div>
      ),
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
                  product "{item.name}" and remove it from our servers.
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

  const getStatusCounts = () => {
    const activeCount = products.filter((p) => p.status === "active").length;
    const inactiveCount = products.filter(
      (p) => p.status === "inactive",
    ).length;
    const lowStockCount = products.filter((p) => p.quantity <= 10).length;

    return {
      activeCount,
      inactiveCount,
      lowStockCount,
      totalCount: products.length,
    };
  };

  const { activeCount, inactiveCount, lowStockCount, totalCount } =
    getStatusCounts();

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">All Products</h1>
          <div className="flex space-x-4 mt-2">
            <Badge variant="default">Total: {totalCount}</Badge>
            <Badge variant="default">Active: {activeCount}</Badge>
            <Badge variant="secondary">Inactive: {inactiveCount}</Badge>
            {lowStockCount > 0 && (
              <Badge variant="destructive">Low Stock: {lowStockCount}</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!isReorderMode ? (
            <>
              <Button variant="outline" onClick={enterReorderMode}>
                Reorder Products
              </Button>
              <Button onClick={() => setDrawerOpen(true)}>Add Product</Button>
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

      {!isReorderMode && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Filter by Category:
            </span>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCategory !== "all" && (
            <Badge variant="outline" className="text-xs">
              Showing: {filteredProducts.length} of {products.length}
            </Badge>
          )}
        </div>
      )}

      {isReorderMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Reorder Mode Active
              </p>
              <p className="text-xs text-blue-600">
                Drag products to reorder them in the list.
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
          data={filteredProducts}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchable
          pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20, 50] }}
          searchPlaceholder="Search products by name, description, or category..."
        />
      )}

      <ProductModal
        drawerOpen={drawerOpen}
        onProductAdded={handleProductAdded}
        setDrawerOpen={handleDrawerClose}
        editingProduct={editingProduct}
      />
    </div>
  );
}
