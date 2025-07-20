/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getFirestore,
} from "firebase/firestore";
import { toast } from "sonner";
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const db = getFirestore();

const validationSchema = Yup.object({
  code: Yup.string()
    .min(3, "Coupon code must be at least 3 characters")
    .required("Coupon code is required"),
  description: Yup.string()
    .min(10, "Description must be at least 10 characters")
    .required("Description is required"),
  type: Yup.string()
    .oneOf(["delivery", "packaging", "other"], "Invalid coupon type")
    .required("Coupon type is required"),
  discountValue: Yup.number().when("type", {
    is: "other",
    then: (schema) =>
      schema
        .min(0, "Discount value must be non-negative")
        .required("Discount value is required for 'other' type"),
    otherwise: (schema) => schema.nullable(),
  }),
  discountType: Yup.string().when("type", {
    is: "other",
    then: (schema) =>
      schema
        .oneOf(["percentage", "fixed"], "Invalid discount type")
        .required("Discount type is required for 'other' type"),
    otherwise: (schema) => schema.nullable(),
  }),
  validFrom: Yup.date().required("Valid from date is required"),
  validUntil: Yup.date()
    .min(Yup.ref("validFrom"), "Valid until must be after valid from")
    .required("Valid until date is required"),
  status: Yup.string()
    .oneOf(["active", "inactive"], "Invalid status")
    .required("Status is required"),
});

type CouponModalProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onCouponAdded: (coupon: any) => void;
  onCouponUpdated: (coupon: any) => void;
  selectedCoupon: any | null;
};

const CouponModal: React.FC<CouponModalProps> = ({
  drawerOpen,
  setDrawerOpen,
  onCouponAdded,
  onCouponUpdated,
  selectedCoupon,
}) => {
  const [loading, setLoading] = useState(false);

  const formik: any = useFormik({
    initialValues: {
      code: "",
      description: "",
      type: "delivery",
      discountValue: null,
      discountType: "percentage",
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: new Date().toISOString().split("T")[0],
      status: "active",
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleSubmit(values);
    },
  });

  useEffect(() => {
    if (selectedCoupon) {
      formik.setValues({
        code: selectedCoupon.code || "",
        description: selectedCoupon.description || "",
        type: selectedCoupon.type || "delivery",
        discountValue: selectedCoupon.discountValue || null,
        discountType: selectedCoupon.discountType || "percentage",
        validFrom: selectedCoupon.validFrom
          ? new Date(selectedCoupon.validFrom).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        validUntil: selectedCoupon.validUntil
          ? new Date(selectedCoupon.validUntil).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: selectedCoupon.status || "active",
      });
    } else {
      formik.resetForm();
    }
  }, [selectedCoupon]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const couponData = {
        code: values.code,
        description: values.description,
        type: values.type,
        discountValue: values.type === "other" ? values.discountValue : null,
        discountType: values.type === "other" ? values.discountType : null,
        validFrom: new Date(values.validFrom),
        validUntil: new Date(values.validUntil),
        status: values.status,
        updatedAt: new Date(),
        ...(selectedCoupon ? {} : { createdAt: new Date() }),
      };

      if (selectedCoupon) {
        const couponRef = doc(db, "coupons", selectedCoupon.id);
        await updateDoc(couponRef, couponData);
        toast.success("Coupon updated successfully!");
        onCouponUpdated({ id: selectedCoupon.id, ...couponData });
      } else {
        const docRef = await addDoc(collection(db, "coupons"), couponData);
        toast.success("Coupon added successfully!");
        onCouponAdded({ id: docRef.id, ...couponData });
      }

      formik.resetForm();
      setDrawerOpen(false);
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error(
        `Failed to ${
          selectedCoupon ? "update" : "add"
        } coupon. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setDrawerOpen(false);
  };

  return (
    <MasterDrawer
      title={selectedCoupon ? "Edit Coupon" : "Add New Coupon"}
      isOpen={drawerOpen}
      onOpenChange={setDrawerOpen}
      size="full"
      position="right"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={formik.handleSubmit}
            disabled={loading || !formik.isValid}
          >
            {loading
              ? "Saving..."
              : selectedCoupon
              ? "Update Coupon"
              : "Save Coupon"}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={formik.handleSubmit}
        className="space-y-6 p-4 max-h-[80vh] overflow-y-auto"
      >
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                name="code"
                placeholder="Enter coupon code"
                value={formik.values.code}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.code && formik.errors.code
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.code && formik.errors.code && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.code}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the coupon..."
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={4}
                className={
                  formik.touched.description && formik.errors.description
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.description && formik.errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coupon Type and Discount */}
        <Card>
          <CardHeader>
            <CardTitle>Coupon Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="type">Coupon Type *</Label>
              <Select
                value={formik.values.type}
                onValueChange={(value) => formik.setFieldValue("type", value)}
              >
                <SelectTrigger
                  className={
                    formik.touched.type && formik.errors.type
                      ? "border-red-500"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select coupon type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">
                    Delivery (Free Delivery)
                  </SelectItem>
                  <SelectItem value="packaging">
                    Packaging (Free Packaging)
                  </SelectItem>
                  <SelectItem value="other">
                    Other (Discount Amount/Percentage)
                  </SelectItem>
                </SelectContent>
              </Select>
              {formik.touched.type && formik.errors.type && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.type}
                </p>
              )}
            </div>

            {formik.values.type === "other" && (
              <>
                <div>
                  <Label htmlFor="discountType">Discount Type *</Label>
                  <Select
                    value={formik.values.discountType}
                    onValueChange={(value) =>
                      formik.setFieldValue("discountType", value)
                    }
                  >
                    <SelectTrigger
                      className={
                        formik.touched.discountType &&
                        formik.errors.discountType
                          ? "border-red-500"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  {formik.touched.discountType &&
                    formik.errors.discountType && (
                      <p className="text-red-500 text-sm mt-1">
                        {formik.errors.discountType}
                      </p>
                    )}
                </div>

                <div>
                  <Label htmlFor="discountValue">Discount Value *</Label>
                  <Input
                    id="discountValue"
                    name="discountValue"
                    type="number"
                    placeholder={
                      formik.values.discountType === "percentage"
                        ? "Enter percentage (0-100)"
                        : "Enter fixed amount"
                    }
                    value={formik.values.discountValue}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={
                      formik.touched.discountValue &&
                      formik.errors.discountValue
                        ? "border-red-500"
                        : ""
                    }
                  />
                  {formik.touched.discountValue &&
                    formik.errors.discountValue && (
                      <p className="text-red-500 text-sm mt-1">
                        {formik.errors.discountValue}
                      </p>
                    )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Validity Period */}
        <Card>
          <CardHeader>
            <CardTitle>Validity Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="validFrom">Valid From *</Label>
              <Input
                id="validFrom"
                name="validFrom"
                type="date"
                value={formik.values.validFrom}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.validFrom && formik.errors.validFrom
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.validFrom && formik.errors.validFrom && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.validFrom}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="validUntil">Valid Until *</Label>
              <Input
                id="validUntil"
                name="validUntil"
                type="date"
                value={formik.values.validUntil}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.validUntil && formik.errors.validUntil
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.validUntil && formik.errors.validUntil && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.validUntil}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status *</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formik.values.status}
              onValueChange={(value) => formik.setFieldValue("status", value)}
            >
              <SelectTrigger
                className={
                  formik.touched.status && formik.errors.status
                    ? "border-red-500"
                    : ""
                }
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {formik.touched.status && formik.errors.status && (
              <p className="text-red-500 text-sm mt-1">
                {formik.errors.status}
              </p>
            )}
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default CouponModal;
