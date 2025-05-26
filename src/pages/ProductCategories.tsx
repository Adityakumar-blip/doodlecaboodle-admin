import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import ProductCategoriesModal from "@/views/ProductCategoriesModal";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Eye, Pencil, Trash2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  showInMenu: boolean;
  isFeatured: boolean;
};

export default function ProductCategories() {
  const [categories, setCategories] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Product | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "add">("add");

  // Fetch categories from Firestore
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productCategories"));
      const fetchedCategories = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setCategories(fetchedCategories);
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

  const columns: DataTableColumn<Product>[] = [
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">All Product Categories</h1>
        <Button
          onClick={() => {
            setSelectedCategory(null);
            setModalMode("add");
            setDrawerOpen(true);
          }}
        >
          Add Category
        </Button>
      </div>

      <DataTable
        data={categories}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 20] }}
      />

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
