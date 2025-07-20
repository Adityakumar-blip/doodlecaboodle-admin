import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import CouponModal from "@/views/CouponModal";

type Coupon = {
  id: string;
  code: string;
  description: string;
  type: "delivery" | "packaging" | "other";
  discountValue?: number; // For 'other' type: percentage or fixed amount
  discountType?: "percentage" | "fixed"; // For 'other' type
  status: "active" | "inactive";
  validFrom: Date;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
};

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const fetchCoupons = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "coupons"));
      const fetchedCoupons = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        validFrom: doc.data().validFrom.toDate(),
        validUntil: doc.data().validUntil.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Coupon[];
      setCoupons(fetchedCoupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Failed to fetch coupons");
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCouponAdded = (newCoupon: Coupon) => {
    setCoupons((prev) => [...prev, newCoupon]);
    setDrawerOpen(false);
  };

  const handleCouponUpdated = (updatedCoupon: Coupon) => {
    setCoupons((prev) =>
      prev.map((coupon) =>
        coupon.id === updatedCoupon.id ? updatedCoupon : coupon
      )
    );
    setDrawerOpen(false);
    setSelectedCoupon(null);
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== couponId));
      toast.success("Coupon deleted successfully");
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Failed to delete coupon");
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDrawerOpen(true);
  };

  const columns: DataTableColumn<Coupon>[] = [
    {
      id: "code",
      header: "Code",
      cell: (item) => item.code,
      sortable: true,
    },
    {
      id: "description",
      header: "Description",
      cell: (item) => (
        <div className="max-w-xs truncate">{item.description}</div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (item) => item.type.charAt(0).toUpperCase() + item.type.slice(1),
      sortable: true,
    },
    {
      id: "discount",
      header: "Discount",
      cell: (item) => {
        if (item.type === "delivery") return "Free Delivery";
        if (item.type === "packaging") return "Free Packaging";
        return item.discountType === "percentage"
          ? `${item.discountValue}%`
          : `$${item.discountValue}`;
      },
    },
    {
      id: "validUntil",
      header: "Valid Until",
      cell: (item) => new Date(item.validUntil).toLocaleDateString(),
      sortable: true,
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => (
        <span
          className={
            item.status === "active" ? "text-green-600" : "text-red-600"
          }
        >
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      ),
      sortable: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditCoupon(item)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteCoupon(item.id)}
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
        <h1 className="text-xl font-semibold">All Coupons</h1>
        <Button
          onClick={() => {
            setSelectedCoupon(null);
            setDrawerOpen(true);
          }}
        >
          Add Coupon
        </Button>
      </div>

      <DataTable
        data={coupons}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 20] }}
      />

      <CouponModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onCouponAdded={handleCouponAdded}
        onCouponUpdated={handleCouponUpdated}
        selectedCoupon={selectedCoupon}
      />
    </div>
  );
}
