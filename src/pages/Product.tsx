import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";

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

      <MasterDrawer
        title="Add Product"
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        size="md"
        position="right"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>Save</Button>
          </div>
        }
      >
        <form className="space-y-4 p-2">
          <Input
            placeholder="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <Input
            type="number"
            placeholder="Price"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: Number(e.target.value) })
            }
          />
          <Input
            type="number"
            placeholder="Quantity"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: Number(e.target.value) })
            }
          />
          <Input
            placeholder="Category"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
          />
        </form>
      </MasterDrawer>
    </div>
  );
}
