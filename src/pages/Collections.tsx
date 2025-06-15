import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CollectionModal from "@/views/CollectionModal";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
};

export default function Collections() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch collections from Firestore
  useEffect(() => {
    const collectionsRef = collection(db, "collections");

    // Real-time listener for collections
    const unsubscribe = onSnapshot(
      collectionsRef,
      (snapshot) => {
        const fetchedProducts: Product[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(fetchedProducts);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching collections:", error);
        setIsLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

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

  console.log("products", products);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">All Collections</h1>
        <Button onClick={() => setDrawerOpen(true)}>Add Collection</Button>
      </div>

      {isLoading ? (
        <div>Loading collections...</div>
      ) : products.length === 0 ? (
        <div>No collections found.</div>
      ) : (
        <DataTable
          data={products}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchable
          pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 20] }}
        />
      )}

      <CollectionModal
        drawerOpen={drawerOpen}
        onCollectionAdded={() => {}}
        setDrawerOpen={setDrawerOpen}
      />
    </div>
  );
}
