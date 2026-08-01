/* eslint-disable @typescript-eslint/no-explicit-any */
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Film, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  collection,
  addDoc,
  getFirestore,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { toast } from "sonner";
import { uploadVideoToCloudinary } from "@/services/CloudinaryUpload";

const db = getFirestore();

const reelSchema = Yup.object({
  title: Yup.string()
    .min(2, "Title must be at least 2 characters")
    .required("Title is required"),
  caption: Yup.string()
    .min(5, "Caption must be at least 5 characters")
    .required("Caption is required"),
  videoUrl: Yup.string().required("Video file is required"),
  products: Yup.array()
    .min(1, "Please link at least one product")
    .required("Please link at least one product"),
  displayOrder: Yup.number().typeError("Must be a number").integer("Must be an integer").required("Display order is required"),
});

interface ReelModalProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onReelAdded: (reel: any) => void;
  editingReel: any | null;
}

const ReelModal: React.FC<ReelModalProps> = ({
  drawerOpen,
  setDrawerOpen,
  onReelAdded,
  editingReel,
}) => {
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, "products");
        // Only active products
        const q = query(productsRef, where("status", "==", "active"));
        const snap = await getDocs(q);
        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(items);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };

    fetchProducts();
  }, []);

  // Formik setup
  const formik: any = useFormik({
    initialValues: {
      title: editingReel?.title || "",
      caption: editingReel?.caption || "",
      videoUrl: editingReel?.videoUrl || "",
      products: editingReel?.products || (editingReel?.productId ? [{
        id: editingReel.productId,
        name: editingReel.productName || "",
        price: editingReel.productPrice || 0,
        image: editingReel.productImage || ""
      }] : []),
      displayOrder: editingReel?.displayOrder !== undefined ? editingReel.displayOrder : 1,
    },
    validationSchema: reelSchema,
    onSubmit: async (values) => {
      await handleSaveReel(values);
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (editingReel) {
      if (editingReel.videoUrl) {
        setVideoPreview(editingReel.videoUrl);
      }
      
      // Load selected products (with migration conversion if editing an older reel)
      if (editingReel.products) {
        setSelectedProducts(editingReel.products);
      } else if (editingReel.productId) {
        setSelectedProducts([{
          id: editingReel.productId,
          name: editingReel.productName || "",
          price: editingReel.productPrice || 0,
          image: editingReel.productImage || ""
        }]);
      } else {
        setSelectedProducts([]);
      }
    } else {
      setSelectedProducts([]);
      setVideoPreview("");
      setVideoFile(null);
    }
  }, [editingReel]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a valid video file.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreview(preview);
    formik.setFieldValue("videoUrl", preview);
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    formik.setFieldValue("videoUrl", "");
  };

  const handleSelectProduct = (product: any) => {
    // Check if already selected
    if (selectedProducts.some((p) => p.id === product.id)) {
      toast.info("Product already linked.");
      return;
    }

    const newProductLink = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url || "",
    };

    const newSelection = [...selectedProducts, newProductLink];
    setSelectedProducts(newSelection);
    formik.setFieldValue("products", newSelection);
    setSearchQuery("");
  };

  const handleRemoveProduct = (productId: string) => {
    const newSelection = selectedProducts.filter((p) => p.id !== productId);
    setSelectedProducts(newSelection);
    formik.setFieldValue("products", newSelection);
  };

  const handleSaveReel = async (values: any) => {
    setLoading(true);
    try {
      let finalVideoUrl = editingReel?.videoUrl || "";

      if (videoFile) {
        finalVideoUrl = await uploadVideoToCloudinary(videoFile);
      }

      const firstProduct = values.products[0] || {};

      const reelData = {
        title: values.title,
        caption: values.caption,
        videoUrl: finalVideoUrl,
        products: values.products,
        // Backward compatibility fallback fields
        productId: firstProduct.id || "",
        productName: firstProduct.name || "",
        productPrice: firstProduct.price || 0,
        productImage: firstProduct.image || "",
        displayOrder: Number(values.displayOrder),
        likesCount: editingReel?.likesCount || 0,
        createdAt: editingReel ? editingReel.createdAt : new Date(),
        updatedAt: new Date(),
      };

      let docRef;
      if (editingReel) {
        docRef = doc(db, "reels", editingReel.id);
        await updateDoc(docRef, reelData);
      } else {
        docRef = await addDoc(collection(db, "reels"), reelData);
      }

      toast.success(
        editingReel
          ? "Reel updated successfully!"
          : "Reel added successfully!"
      );
      formik.resetForm();
      setVideoFile(null);
      setVideoPreview("");
      setSelectedProducts([]);
      setDrawerOpen(false);

      if (onReelAdded) {
        onReelAdded({
          id: editingReel ? editingReel.id : docRef.id,
          ...reelData,
        });
      }
    } catch (error) {
      console.error("Error saving reel:", error);
      toast.error(
        editingReel ? "Failed to update reel." : "Failed to add reel."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setVideoFile(null);
    setVideoPreview("");
    setSelectedProducts([]);
    setDrawerOpen(false);
  };

  // Filter products based on search query
  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MasterDrawer
      title={editingReel ? "Edit Reel" : "Add New Reel"}
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
            {loading ? "Saving..." : editingReel ? "Update Reel" : "Save Reel"}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={formik.handleSubmit}
        className="space-y-6 p-4 max-h-[80vh] overflow-y-auto"
      >
        {/* Basic Info */}
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
                placeholder="Enter reel title (e.g. Birthday bliss)"
                value={formik.values.title}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.title && formik.errors.title ? "border-red-500" : ""
                }
              />
              {formik.touched.title && formik.errors.title && (
                <p className="text-red-500 text-sm mt-1">{formik.errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="caption">Caption / Description *</Label>
              <Textarea
                id="caption"
                name="caption"
                placeholder="Enter caption for the reel..."
                value={formik.values.caption}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={3}
                className={
                  formik.touched.caption && formik.errors.caption ? "border-red-500" : ""
                }
              />
              {formik.touched.caption && formik.errors.caption && (
                <p className="text-red-500 text-sm mt-1">{formik.errors.caption}</p>
              )}
            </div>

            <div>
              <Label htmlFor="displayOrder">Display Order *</Label>
              <Input
                id="displayOrder"
                name="displayOrder"
                type="number"
                placeholder="1, 2, 3..."
                value={formik.values.displayOrder}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.displayOrder && formik.errors.displayOrder
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.displayOrder && formik.errors.displayOrder && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.displayOrder}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Video Upload *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="cursor-pointer"
            />
            {formik.touched.videoUrl && formik.errors.videoUrl && (
              <p className="text-red-500 text-sm">{formik.errors.videoUrl}</p>
            )}

            {videoPreview && (
              <div className="relative mt-3 w-48 mx-auto">
                <video
                  src={videoPreview}
                  className="w-full aspect-[9/16] object-cover rounded-xl border-2 border-dashed border-gray-300 shadow-md"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full h-8 w-8"
                  onClick={removeVideo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              💡 Recommended vertical aspect ratio (9:16) for the best Reels visual layout.
            </p>
          </CardContent>
        </Card>

        {/* Product Link Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Link Products *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Products List */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Products ({selectedProducts.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                  {selectedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2 bg-white border rounded-lg shadow-sm"
                    >
                      <img
                        src={p.image || "/placeholder.svg"}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded border"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold truncate text-gray-900">
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-gray-500">₹{p.price}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveProduct(p.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Autocomplete / Search */}
            <div className="space-y-2">
              <Label>Search & Link Catalog Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Type product name to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {searchQuery && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white divide-y shadow-lg">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <img
                          src={p.images?.[0]?.url || "/placeholder.svg"}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-500">₹{p.price}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-500">
                      No active products found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {formik.touched.products && formik.errors.products && (
              <p className="text-red-500 text-sm mt-1">
                {formik.errors.products as string}
              </p>
            )}
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default ReelModal;
