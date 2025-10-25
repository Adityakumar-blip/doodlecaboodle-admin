/* eslint-disable @typescript-eslint/no-explicit-any */
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  collection,
  addDoc,
  getFirestore,
  updateDoc,
  doc,
} from "firebase/firestore";
import { toast } from "sonner";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";

const db = getFirestore();

const validationSchema = Yup.object({
  title: Yup.string()
    .min(2, "Title must be at least 2 characters")
    .required("Title is required"),
  description: Yup.string()
    .min(10, "Description must be at least 10 characters")
    .required("Description is required"),
  desktopImage: Yup.string().required("Desktop image is required"),
  mobileImage: Yup.string().required("Mobile image is required"),
});

const BannerModal = ({
  drawerOpen,
  setDrawerOpen,
  onBannerAdded,
  editingBanner,
}) => {
  const [desktopPreview, setDesktopPreview] = useState<string>("");
  const [mobilePreview, setMobilePreview] = useState<string>("");
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const formik: any = useFormik({
    initialValues: {
      title: editingBanner?.title || "",
      description: editingBanner?.description || "",
      desktopImage: editingBanner?.desktopImage || "",
      mobileImage: editingBanner?.mobileImage || "",
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleAddBanner(values);
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (editingBanner) {
      if (editingBanner.desktopImage) {
        setDesktopPreview(editingBanner.desktopImage);
      }
      if (editingBanner.mobileImage) {
        setMobilePreview(editingBanner.mobileImage);
      }
    }
  }, [editingBanner]);

  const handleImageChange = (e, type: "desktop" | "mobile") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    if (type === "desktop") {
      setDesktopFile(file);
      setDesktopPreview(preview);
      formik.setFieldValue("desktopImage", preview);
    } else {
      setMobileFile(file);
      setMobilePreview(preview);
      formik.setFieldValue("mobileImage", preview);
    }
  };

  const removeImage = (type: "desktop" | "mobile") => {
    if (type === "desktop") {
      setDesktopFile(null);
      setDesktopPreview("");
      formik.setFieldValue("desktopImage", "");
    } else {
      setMobileFile(null);
      setMobilePreview("");
      formik.setFieldValue("mobileImage", "");
    }
  };

  const handleAddBanner = async (values) => {
    setLoading(true);
    try {
      let desktopUrl = editingBanner?.desktopImage || "";
      let mobileUrl = editingBanner?.mobileImage || "";

      if (desktopFile) {
        const uploadResult = await uploadImagesToCloudinary([desktopFile]);
        desktopUrl = uploadResult[0]; // first uploaded url
      }

      if (mobileFile) {
        const uploadResult = await uploadImagesToCloudinary([mobileFile]);
        mobileUrl = uploadResult[0]; // first uploaded url
      }

      const bannerData = {
        ...values,
        desktopImage: desktopUrl,
        mobileImage: mobileUrl,
        createdAt: editingBanner ? editingBanner.createdAt : new Date(),
        updatedAt: new Date(),
      };

      let docRef;
      if (editingBanner) {
        docRef = doc(db, "banners", editingBanner.id);
        await updateDoc(docRef, bannerData);
      } else {
        docRef = await addDoc(collection(db, "banners"), bannerData);
      }

      toast.success(
        editingBanner
          ? "Banner updated successfully!"
          : "Banner added successfully!"
      );
      formik.resetForm();
      setDesktopFile(null);
      setMobileFile(null);
      setDesktopPreview("");
      setMobilePreview("");
      setDrawerOpen(false);

      if (onBannerAdded) {
        onBannerAdded({
          id: editingBanner ? editingBanner.id : docRef.id,
          ...bannerData,
        });
      }
    } catch (error) {
      console.error("Error processing banner:", error);
      toast.error(
        editingBanner ? "Failed to update banner." : "Failed to add banner."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview("");
    setMobilePreview("");
    setDrawerOpen(false);
  };

  return (
    <MasterDrawer
      title={editingBanner ? "Edit Banner" : "Add New Banner"}
      isOpen={drawerOpen}
      onOpenChange={setDrawerOpen}
      size="md"
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
              : editingBanner
              ? "Update Banner"
              : "Save Banner"}
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
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter banner title"
                value={formik.values.title}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.title && formik.errors.title
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.title && formik.errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.title}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your banner..."
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

        {/* Desktop Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Desktop Image *</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, "desktop")}
              className="cursor-pointer"
            />
            {formik.touched.desktopImage && formik.errors.desktopImage && (
              <p className="text-red-500 text-sm">
                {formik.errors.desktopImage}
              </p>
            )}
            {desktopPreview && (
              <div className="relative mt-3 w-40">
                <img
                  src={desktopPreview}
                  className="w-full h-32 object-cover rounded border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 bg-gray-800 bg-opacity-50"
                  onClick={() => removeImage("desktop")}
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Mobile Image *</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, "mobile")}
              className="cursor-pointer"
            />
            {formik.touched.mobileImage && formik.errors.mobileImage && (
              <p className="text-red-500 text-sm">
                {formik.errors.mobileImage}
              </p>
            )}
            {mobilePreview && (
              <div className="relative mt-3 w-40">
                <img
                  src={mobilePreview}
                  className="w-full h-32 object-cover rounded border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 bg-gray-800 bg-opacity-50"
                  onClick={() => removeImage("mobile")}
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default BannerModal;
