/* eslint-disable @typescript-eslint/no-explicit-any */
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

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

const OrderDetailsModal = ({ drawerOpen, setDrawerOpen, selectedOrder }) => {
  if (!selectedOrder) return null;

  const handleClose = () => {
    setDrawerOpen(false);
  };

  return (
    <MasterDrawer
      title={`Order Details - ${
        selectedOrder.custom_order_id || selectedOrder.orderId
      }`}
      isOpen={drawerOpen}
      onOpenChange={setDrawerOpen}
      size="lg"
      position="right"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Order ID:</span>
              <span>
                {selectedOrder.custom_order_id || selectedOrder.orderId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Created At:</span>
              <span>
                {new Date(
                  selectedOrder.created_at || selectedOrder?.createdAt
                ).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span>{selectedOrder.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Payment ID:</span>
              <span>{selectedOrder.payment_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Receipt:</span>
              <span>{selectedOrder.receipt}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Currency:</span>
              <span>{selectedOrder.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Amount:</span>
              <span>{selectedOrder.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Amount Paid:</span>
              <span>{selectedOrder.amount_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Subtotal:</span>
              <span>{selectedOrder.subtotal}</span>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Details */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Name:</span>
              <span>{selectedOrder.shipping_details.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Email:</span>
              <span>{selectedOrder.shipping_details.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Phone:</span>
              <span>{selectedOrder.shipping_details.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Address:</span>
              <span>
                {selectedOrder.shipping_details.address.line1},{" "}
                {selectedOrder.shipping_details.address.city},{" "}
                {selectedOrder.shipping_details.address.state},{" "}
                {selectedOrder.shipping_details.address.pincode},{" "}
                {selectedOrder.shipping_details.address.country}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Charges */}
        <Card>
          <CardHeader>
            <CardTitle>Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Subtotal:</span>
              <span>{selectedOrder.charges.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Delivery Charges:</span>
              <span>{selectedOrder.charges.deliveryCharges}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Discount:</span>
              <span>{selectedOrder.charges.discount}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Packaging Charges:</span>
              <span>{selectedOrder.charges.packagingCharges}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Personal Note:</span>
              <span>{selectedOrder.charges.personalNote || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cart Items */}
        <Card>
          <CardHeader>
            <CardTitle>Cart Items</CardTitle>
          </CardHeader>
          <CardContent>
            {(selectedOrder?.cart_items || selectedOrder?.items)?.map(
              (item, index) => (
                <div key={index} className="mb-4 border-b pb-4 last:border-b-0">
                  <div className="font-medium">{item.title}</div>
                  <div>Size: {item.size.label}</div>
                  <div>Quantity: {item.quantity}</div>
                  <div>Price: {item.price.toFixed(2)}</div>
                  {item.uploadedImageUrl && (
                    <img
                      src={item.uploadedImageUrl}
                      alt={item.title}
                      className="w-32 h-32 object-cover rounded mt-2"
                    />
                  )}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </MasterDrawer>
  );
};

export default OrderDetailsModal;
