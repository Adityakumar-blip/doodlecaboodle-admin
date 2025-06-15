import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";
import ProductModal from "@/views/ProductModal";

import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
};

const initialProducts: Product[] = [
  {
    id: "1",
    name: "Wireless Mouse",
    description: "A smooth and responsive mouse",
    price: 899,
    quantity: 120,
    category: "Electronics",
  },
  {
    id: "2",
    name: "Notebook",
    description: "200-page ruled notebook",
    price: 49,
    quantity: 500,
    category: "Stationery",
  },
];

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const fetchedCategories = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Add product form state
  const [formData, setFormData] = useState<Omit<Product, "id">>({
    name: "",
    description: "",
    price: 0,
    quantity: 0,
    category: "",
  });

  const handleAddProduct = () => {
    const newProduct: Product = {
      ...formData,
      id: Date.now().toString(), // simple ID generator
    };
    setProducts((prev) => [...prev, newProduct]);
    setDrawerOpen(false);
    setFormData({
      name: "",
      description: "",
      price: 0,
      quantity: 0,
      category: "",
    });
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
    { id: "quantity", header: "Quantity", cell: (item) => item.quantity },
    { id: "category", header: "Category", cell: (item) => item.category },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">All Products</h1>
        <Button onClick={() => setDrawerOpen(true)}>Add Product</Button>
      </div>

      <DataTable
        data={products}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 20] }}
      />

      <ProductModal
        drawerOpen={drawerOpen}
        onProductAdded={() => {}}
        setDrawerOpen={setDrawerOpen}
      />
    </div>
  );
}
