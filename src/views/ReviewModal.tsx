import React, { useState, useEffect } from "react";
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";

interface Review {
  id?: string;
  createdAt?: Date | string;
  email: string;
  image: string;
  isActive: boolean;
  isPublished: boolean;
  name: string;
  rating: number;
  reviewText: string;
}

interface ReviewModalProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onReviewAdded: (review: Review) => void;
  editingReview?: Review | null;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  rating: Yup.number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5")
    .required("Rating is required"),
  reviewText: Yup.string()
    .min(10, "Review must be at least 10 characters")
    .required("Review text is required"),
});

const ReviewModal: React.FC<ReviewModalProps> = ({
  drawerOpen,
  setDrawerOpen,
  onReviewAdded,
  editingReview,
}) => {
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: editingReview?.name || "",
      email: editingReview?.email || "",
      image: editingReview?.image || "",
      rating: editingReview?.rating || 0,
      reviewText: editingReview?.reviewText || "",
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleAddReview(values);
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (editingReview?.image) {
      setMediaPreview(editingReview.image);
    } else {
      setMediaPreview("");
    }
    setMediaFile(null);
  }, [editingReview]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (image or video)
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/webm",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error(
        "Please upload a valid image (JPEG, PNG, GIF) or video (MP4, WebM)"
      );
      return;
    }

    const preview = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaPreview(preview);
    formik.setFieldValue("image", preview);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview("");
    formik.setFieldValue("image", "");
  };

  const handleAddReview = async (values: any) => {
    setLoading(true);
    try {
      let image = editingReview?.image || "";

      if (mediaFile) {
        const uploadResult = await uploadImagesToCloudinary([mediaFile]);
        image = uploadResult;
      }

      const reviewData = {
        ...values,
        image: image,
        isActive: editingReview ? editingReview.isActive : false,
        isPublished: editingReview ? editingReview.isPublished : false,
        createdAt: editingReview ? editingReview.createdAt : new Date(),
        updatedAt: new Date(),
        rating: Number(values.rating),
      };

      let docRef;
      if (editingReview) {
        docRef = doc(db, "reviews", editingReview.id!);
        await updateDoc(docRef, reviewData);
      } else {
        docRef = await addDoc(collection(db, "reviews"), reviewData);
      }

      toast.success(
        editingReview
          ? "Review updated successfully!"
          : "Review added successfully!"
      );
      formik.resetForm();
      setMediaFile(null);
      setMediaPreview("");
      setDrawerOpen(false);

      onReviewAdded({
        id: editingReview ? editingReview.id : docRef.id,
        ...reviewData,
      });
    } catch (error) {
      console.error("Error processing review:", error);
      toast.error(
        editingReview ? "Failed to update review." : "Failed to add review."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setMediaFile(null);
    setMediaPreview("");
    setDrawerOpen(false);
  };

  return (
    <MasterDrawer
      title={editingReview ? "Edit Review" : "Add New Review"}
      isOpen={drawerOpen}
      onOpenChange={setDrawerOpen}
      size="md"
      position="right"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={formik.handleSubmit} disabled={loading}>
            {loading
              ? "Saving..."
              : editingReview
              ? "Update Review"
              : "Save Review"}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={formik.handleSubmit}
        className="space-y-6 p-4 max-h-[80vh] overflow-y-auto"
      >
        <Card>
          <CardHeader>
            <CardTitle>Review Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter reviewer name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.name && formik.errors.name
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter reviewer email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.email && formik.errors.email
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="rating">Rating (1-5) *</Label>
              <Input
                id="rating"
                name="rating"
                type="number"
                min="1"
                max="5"
                placeholder="Enter rating"
                value={formik.values.rating}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.rating && formik.errors.rating
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.rating && formik.errors.rating && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.rating}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="reviewText">Review Text *</Label>
              <Textarea
                id="reviewText"
                name="reviewText"
                placeholder="Enter review text"
                value={formik.values.reviewText}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={4}
                className={
                  formik.touched.reviewText && formik.errors.reviewText
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.reviewText && formik.errors.reviewText && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.reviewText}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media Upload (Image or Video)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/gif,video/mp4,video/webm"
              onChange={handleMediaChange}
              className="cursor-pointer"
            />
            {formik.touched.image && formik.errors.image && (
              <p className="text-red-500 text-sm">{formik.errors.image}</p>
            )}
            {mediaPreview && (
              <div className="relative mt-3 w-40">
                {mediaPreview.match(/\.(mp4|webm)$/i) ? (
                  <video
                    src={mediaPreview}
                    className="w-full h-32 object-cover rounded border"
                    controls
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    className="w-full h-32 object-cover rounded border"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 bg-gray-800 bg-opacity-50"
                  onClick={removeMedia}
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

export default ReviewModal;
