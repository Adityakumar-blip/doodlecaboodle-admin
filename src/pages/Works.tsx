import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import WorkModal from "./WorkModal";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

type Product = {
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
};

export default function WorkList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "ourworks"));
      const fetchedProducts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [...prev, newProduct]);
    setDrawerOpen(false);
    setEditingProduct(null);
  };

  const handleEditProduct = (product: Product) => {
    console.log(product);
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
      toast.success("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const columns: DataTableColumn<Product>[] = [
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
      cell: (item) => (
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">All Works</h1>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setDrawerOpen(true);
          }}
        >
          Add Works
        </Button>
      </div>

      <DataTable
        data={products}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 20] }}
      />

      <WorkModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onProductAdded={editingProduct ? handleUpdateProduct : handleAddProduct}
        editingProduct={editingProduct}
      />
    </div>
  );
}
