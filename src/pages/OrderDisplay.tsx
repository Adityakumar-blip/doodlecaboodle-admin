import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import OrderDetailsModal from "@/views/OrderDetailsModal";

interface Order {
  id: string;
  amount: number;
  amount_paid: number;
  cart_items: Array<{
    artistName: string;
    artworkId: string;
    frame: any | null;
    id: string;
    price: number;
    quantity: number;
    size: {
      label: string;
      priceAdjustment: number;
      value: string;
    };
    timestamp: number;
    title: string;
    uploadedImageUrl: string;
  }>;
  charges: {
    deliveryCharges: string;
    discount: string;
    packagingCharges: string;
    personalNote: string;
    subtotal: string;
  };
  createdAt?: Date;
  created_at: string;
  currency: string;
  custom_order_id: string;
  payment_id: string;
  receipt: string;
  shipping_details: {
    address: {
      city: string;
      country: string;
      line1: string;
      pincode: string;
      state: string;
    };
    email: string;
    name: string;
    phone: string;
  };
  status: string;
  subtotal: string;
  updatedAt?: Date;
  user_id: string;
}

const OrdersDisplay: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
      const fetchedOrders = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Order[];
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const columns: DataTableColumn<Order>[] = [
    {
      id: "custom_order_id",
      header: "Order ID",
      cell: (item: any) => (
        <div className="font-medium">
          {item.custom_order_id || item.orderId}
        </div>
      ),
      sortable: true,
    },
    {
      id: "created_at",
      header: "Date",
      cell: (item) => (
        <div>
          {new Date(item.created_at || item.createdAt).toLocaleString()}
        </div>
      ),
      sortable: true,
    },
    {
      id: "customer",
      header: "Customer",
      cell: (item) => <div>{item.shipping_details.name}</div>,
    },
    {
      id: "amount",
      header: "Amount",
      cell: (item) => (
        <div>
          {item.currency} {item.amount.toFixed(2)}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => (
        <Badge variant={item.status === "created" ? "secondary" : "default"}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
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
            onClick={() => handleView(item)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Order Management</h1>
          <div className="mt-2">
            <Badge variant="default">Total: {orders.length}</Badge>
          </div>
        </div>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20] }}
        searchPlaceholder="Search orders by ID or customer..."
      />

      <OrderDetailsModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        selectedOrder={selectedOrder}
      />
    </div>
  );
};

export default OrdersDisplay;
