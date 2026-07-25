/* eslint-disable @typescript-eslint/no-explicit-any */
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Image, Video } from "lucide-react";
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
import {
  uploadImagesToCloudinary,
  uploadVideoToCloudinary,
} from "@/services/CloudinaryUpload";

const db = getFirestore();

type MediaType = "image" | "video";

const getValidationSchema = (mediaType: MediaType) =>
  Yup.object({
    title: Yup.string()
      .min(2, "Title must be at least 2 characters")
      .required("Title is required"),
    description: Yup.string()
      .min(10, "Description must be at least 10 characters")
      .required("Description is required"),
    desktopImage: Yup.string().required(
      mediaType === "video"
        ? "Desktop video is required"
        : "Desktop image is required"
    ),
    mobileImage: Yup.string().required(
      mediaType === "video"
        ? "Mobile video is required"
        : "Mobile image is required"
    ),
    url: Yup.string().url("Enter a valid URL").nullable(),
  });

const MediaPreview: React.FC<{
  src: string;
  mediaType: MediaType;
  onRemove: () => void;
}> = ({ src, mediaType, onRemove }) => (
  <div className="relative mt-3 w-40">
    {mediaType === "video" ? (
      <video
        src={src}
        className="w-full h-32 object-cover rounded border"
        autoPlay
        muted
        loop
        playsInline
      />
    ) : (
      <img src={src} className="w-full h-32 object-cover rounded border" />
    )}
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="absolute top-1 right-1 bg-gray-800 bg-opacity-50"
      onClick={onRemove}
    >
      <X className="h-4 w-4 text-white" />
    </Button>
  </div>
);

const BannerModal = ({
  drawerOpen,
  setDrawerOpen,
  onBannerAdded,
  editingBanner,
}) => {
  const [mediaType, setMediaType] = useState<MediaType>(
    editingBanner?.mediaType || "image"
  );
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
      url: editingBanner?.url || "",
    },
    validationSchema: getValidationSchema(mediaType),
    onSubmit: async (values) => {
      await handleAddBanner(values);
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (editingBanner) {
      setMediaType(editingBanner.mediaType || "image");
      if (editingBanner.desktopImage) {
        setDesktopPreview(editingBanner.desktopImage);
      }
      if (editingBanner.mobileImage) {
        setMobilePreview(editingBanner.mobileImage);
      }
    }
  }, [editingBanner]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>, slot: "desktop" | "mobile") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    if (slot === "desktop") {
      setDesktopFile(file);
      setDesktopPreview(preview);
      formik.setFieldValue("desktopImage", preview);
    } else {
      setMobileFile(file);
      setMobilePreview(preview);
      formik.setFieldValue("mobileImage", preview);
    }
  };

  const removeMedia = (slot: "desktop" | "mobile") => {
    if (slot === "desktop") {
      setDesktopFile(null);
      setDesktopPreview("");
      formik.setFieldValue("desktopImage", "");
    } else {
      setMobileFile(null);
      setMobilePreview("");
      formik.setFieldValue("mobileImage", "");
    }
  };

  const handleMediaTypeChange = (type: MediaType) => {
    // Reset files when switching type
    setMediaType(type);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview("");
    setMobilePreview("");
    formik.setFieldValue("desktopImage", "");
    formik.setFieldValue("mobileImage", "");
  };

  const handleAddBanner = async (values) => {
    setLoading(true);
    try {
      let desktopUrl = editingBanner?.desktopImage || "";
      let mobileUrl = editingBanner?.mobileImage || "";

      if (mediaType === "video") {
        if (desktopFile) {
          desktopUrl = await uploadVideoToCloudinary(desktopFile);
        }
        if (mobileFile) {
          mobileUrl = await uploadVideoToCloudinary(mobileFile);
        }
      } else {
        if (desktopFile) {
          const uploadResult = await uploadImagesToCloudinary([desktopFile]);
          desktopUrl = uploadResult;
        }
        if (mobileFile) {
          const uploadResult = await uploadImagesToCloudinary([mobileFile]);
          mobileUrl = uploadResult;
        }
      }

      const bannerData = {
        ...values,
        desktopImage: desktopUrl,
        mobileImage: mobileUrl,
        mediaType,
        url: values.url || "",
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

  const acceptAttr = mediaType === "video" ? "video/*" : "image/*";
  const desktopLabel = mediaType === "video" ? "Desktop Video *" : "Desktop Image *";
  const mobileLabel = mediaType === "video" ? "Mobile Video *" : "Mobile Image *";

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

            <div>
              <Label htmlFor="url">URL (optional)</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://your-link.com"
                value={formik.values.url}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={formik.touched.url && formik.errors.url ? "border-red-500" : ""}
              />
              {formik.touched.url && formik.errors.url && (
                <p className="text-red-500 text-sm mt-1">{formik.errors.url}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Media Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Media Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleMediaTypeChange("image")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  mediaType === "image"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <Image className="h-4 w-4" />
                Image
              </button>
              <button
                type="button"
                onClick={() => handleMediaTypeChange("video")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  mediaType === "video"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <Video className="h-4 w-4" />
                Video
              </button>
            </div>
            {mediaType === "video" && (
              <p className="text-sm text-gray-500 mt-2">
                🎬 Videos will autoplay silently and loop on the homepage hero slider.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Desktop Media Upload */}
        <Card>
          <CardHeader>
            <CardTitle>{desktopLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept={acceptAttr}
              onChange={(e) => handleMediaChange(e, "desktop")}
              className="cursor-pointer"
            />
            {formik.touched.desktopImage && formik.errors.desktopImage && (
              <p className="text-red-500 text-sm">
                {formik.errors.desktopImage}
              </p>
            )}
            {desktopPreview && (
              <MediaPreview
                src={desktopPreview}
                mediaType={mediaType}
                onRemove={() => removeMedia("desktop")}
              />
            )}
          </CardContent>
        </Card>

        {/* Mobile Media Upload */}
        <Card>
          <CardHeader>
            <CardTitle>{mobileLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept={acceptAttr}
              onChange={(e) => handleMediaChange(e, "mobile")}
              className="cursor-pointer"
            />
            {formik.touched.mobileImage && formik.errors.mobileImage && (
              <p className="text-red-500 text-sm">
                {formik.errors.mobileImage}
              </p>
            )}
            {mobilePreview && (
              <MediaPreview
                src={mobilePreview}
                mediaType={mediaType}
                onRemove={() => removeMedia("mobile")}
              />
            )}
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default BannerModal;
