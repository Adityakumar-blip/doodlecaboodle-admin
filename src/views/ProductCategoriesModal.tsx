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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import axios from "axios";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";

// Validation schema
const categoryValidationSchema = Yup.object({
  name: Yup.string()
    .required("Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must not exceed 100 characters"),
  slug: Yup.string()
    .matches(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    )
    .max(100, "Slug must not exceed 100 characters"),
  description: Yup.string().max(
    500,
    "Description must not exceed 500 characters"
  ),
  sortOrder: Yup.number()
    .min(0, "Sort order must be 0 or greater")
    .integer("Sort order must be a whole number"),
  imageUrl: Yup.string().url("Please enter a valid URL"),
  bannerUrl: Yup.string().url("Please enter a valid URL"),
  metaTitle: Yup.string().max(60, "Meta title should not exceed 60 characters"),
  metaDescription: Yup.string().max(
    160,
    "Meta description should not exceed 160 characters"
  ),
  commissionRate: Yup.number()
    .min(0, "Commission rate must be 0 or greater")
    .max(100, "Commission rate cannot exceed 100%"),
  taxRate: Yup.number()
    .min(0, "Tax rate must be 0 or greater")
    .max(100, "Tax rate cannot exceed 100%"),
  minOrderAmount: Yup.number().min(
    0,
    "Minimum order amount must be 0 or greater"
  ),
});

const ProductCategoriesModal = ({
  drawerOpen,
  setDrawerOpen,
  selectedCategory,
  mode = "create",
  onSaveSuccess,
}) => {
  const [newTag, setNewTag] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  // ✅ New: multiple banner/gallery upload states
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const galleryInputRef = useRef(null);

  const bannerInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Mock existing categories - replace with your actual data source
  const existingCategories = [
    { id: "1", name: "Electronics" },
    { id: "2", name: "Clothing" },
    { id: "3", name: "Books" },
    { id: "4", name: "Home & Garden" },
    { id: "5", name: "Sports" },
  ];

  // Default form values
  const defaultValues = {
    name: "",
    slug: "",
    description: "",
    parentId: null,
    parentName: null,
    subcategories: [],
    sortOrder: 0,
    imageUrl: "",
    bannerUrl: "",
    galleryImages: [],
    iconClass: "",
    color: "#000000",
    metaTitle: "",
    metaDescription: "",
    tags: [],
    customAttributes: [],
    isActive: true,
    showInMenu: true,
    isFeatured: false,
    isSection: false,
    commissionRate: 0,
    taxRate: 0,
    minOrderAmount: 0,
  };

  // Initialize form values based on mode
  const initialValues =
    mode === "create"
      ? defaultValues
      : { ...defaultValues, ...selectedCategory };

  // Initialize useFormik
  const formik: any = useFormik({
    initialValues,
    validationSchema: categoryValidationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, setErrors, resetForm }) => {
      try {
        setSubmitting(true);

        let bannerUrl = values.bannerUrl;
        let imageUrl = values.imageUrl;

        // Upload banner to Cloudinary if a new file is selected
        if (bannerFile) {
          setUploading(true);
          try {
            bannerUrl = await uploadImagesToCloudinary(bannerFile);
          } catch (error) {
            throw new Error("Failed to upload banner image to Cloudinary");
          } finally {
            setUploading(false);
          }
        }

        // Upload category image to Cloudinary if a new file is selected
        if (imageFile) {
          setUploading(true);
          try {
            imageUrl = await uploadImagesToCloudinary(imageFile);
          } catch (error) {
            throw new Error("Failed to upload category image to Cloudinary");
          } finally {
            setUploading(false);
          }
        }

        const categoryData = {
          ...values,
          bannerUrl,
          imageUrl,
          updatedAt: new Date(),
        };

        if (galleryFiles.length > 0) {
          setUploading(true);
          try {
            const uploadPromises = galleryFiles.map((file) =>
              uploadImagesToCloudinary(file)
            );
            const uploadedUrls = await Promise.all(uploadPromises);
            categoryData.galleryImages = uploadedUrls; // new field
            setGalleryUrls(uploadedUrls);
          } catch (error) {
            throw new Error("Failed to upload gallery images to Cloudinary");
          } finally {
            setUploading(false);
          }
        }

        // Clean up parentId and parentName if no parent
        if (!categoryData.parentId) {
          categoryData.parentId = null;
          categoryData.parentName = null;
        }

        if (mode === "edit" && selectedCategory?.id) {
          // Update existing category
          const categoryRef = doc(db, "productCategories", selectedCategory.id);
          await updateDoc(categoryRef, categoryData);
          console.log("Category updated with ID:", selectedCategory.id);
        } else {
          // Create new category
          categoryData.createdAt = new Date();
          const docRef = await addDoc(
            collection(db, "productCategories"),
            categoryData
          );
          console.log("Category saved with ID:", docRef.id);
        }

        // Handle success
        alert(
          mode === "edit"
            ? "Category updated successfully!"
            : "Category saved successfully!"
        );
        resetForm();
        setBannerFile(null);
        setBannerPreview("");
        setImageFile(null);
        setImagePreview("");
        setDrawerOpen(false);
        if (onSaveSuccess) onSaveSuccess();
      } catch (error) {
        console.error(
          `Error ${mode === "edit" ? "updating" : "saving"} category:`,
          error
        );
        setErrors({
          submit: `Failed to ${
            mode === "edit" ? "update" : "save"
          } category. Please try again.`,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  // ✅ Handle multiple gallery image selections
  const handleGalleryFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const validFiles = files.filter((file: any) =>
      file.type.startsWith("image/")
    );
    if (validFiles.length !== files.length) {
      alert("Some files were skipped because they are not valid images.");
    }

    // Preview selected images
    const previews = validFiles.map((file: any) => URL.createObjectURL(file));
    setGalleryFiles((prev: any) => [...prev, ...validFiles]);
    setGalleryPreviews((prev) => [...prev, ...previews]);
  };

  const removeGalleryImage = (index) => {
    // Remove from local state
    const newFiles = galleryFiles.filter((_, i) => i !== index);
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    const newUrls = galleryUrls.filter((_, i) => i !== index);

    setGalleryFiles(newFiles);
    setGalleryPreviews(newPreviews);
    setGalleryUrls(newUrls);

    // CRITICAL: Also update Formik
    formik.setFieldValue("galleryImages", newUrls);
  };

  // Set initial banner preview if editing
  useEffect(() => {
    if (mode === "edit" && selectedCategory?.bannerUrl) {
      setBannerPreview(selectedCategory.bannerUrl);
    }
    if (mode === "edit" && selectedCategory?.imageUrl) {
      setImagePreview(selectedCategory.imageUrl);
    }
  }, [mode, selectedCategory]);

  // Initialize gallery previews when editing
  useEffect(() => {
    if (mode === "edit" && selectedCategory?.galleryImages?.length > 0) {
      setGalleryPreviews(selectedCategory.galleryImages);
      setGalleryUrls(selectedCategory.galleryImages);
    } else {
      // Reset when switching to create or no gallery
      setGalleryPreviews([]);
      setGalleryUrls([]);
    }
  }, [mode, selectedCategory?.galleryImages]);

  // Lookup and set parentName if missing during edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      formik.values.parentId &&
      !formik.values.parentName
    ) {
      const parent = existingCategories.find(
        (c) => c.id === formik.values.parentId
      );
      if (parent) {
        formik.setFieldValue("parentName", parent.name);
      }
    }
  }, [mode, formik.values.parentId, formik.values.parentName]);

  // Auto-generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Handle banner file selection
  const handleBannerFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB) - Note: Compression will handle larger files in uploadImagesToCloudinary
      if (file.size > 5 * 1024 * 1024) {
        console.log(
          `File size is ${(file.size / (1024 * 1024)).toFixed(
            2
          )}MB, will attempt compression during upload`
        );
      }

      setBannerFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setBannerPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle category image file selection
  const handleImageFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        console.log(
          `File size is ${(file.size / (1024 * 1024)).toFixed(
            2
          )}MB, will attempt compression during upload`
        );
      }

      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add tag
  const addTag = () => {
    if (newTag && !formik.values.tags.includes(newTag)) {
      formik.setFieldValue("tags", [...formik.values.tags, newTag]);
      setNewTag("");
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    const updatedTags = formik.values.tags.filter((tag) => tag !== tagToRemove);
    formik.setFieldValue("tags", updatedTags);
  };

  // Add subcategory
  const addSubcategory = () => {
    if (
      newSubcategory &&
      !formik.values.subcategories.some((sub) => sub.name === newSubcategory)
    ) {
      const newSub = {
        id: Date.now().toString(),
        name: newSubcategory,
        slug: generateSlug(newSubcategory),
        isActive: true,
      };
      formik.setFieldValue("subcategories", [
        ...formik.values.subcategories,
        newSub,
      ]);
      setNewSubcategory("");
    }
  };

  // Remove subcategory
  const removeSubcategory = (subcategoryToRemove) => {
    const updatedSubcategories = formik.values.subcategories.filter(
      (sub) => sub.id !== subcategoryToRemove.id
    );
    formik.setFieldValue("subcategories", updatedSubcategories);
  };

  // Handle Enter key for tags
  const handleTagKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // Handle Enter key for subcategories
  const handleSubcategoryKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubcategory();
    }
  };

  // Handle name change and auto-generate slug
  const handleNameChange = (e) => {
    const name = e.target.value;
    formik.handleChange(e);
    if (
      !formik.values.slug ||
      formik.values.slug === generateSlug(formik.values.name)
    ) {
      formik.setFieldValue("slug", generateSlug(name));
    }
  };

  // Add custom attribute
  // const addAttribute = () => {
  //   const name = document.getElementById("attrName")?.value;
  //   const value = document.getElementById("attrValue")?.value;

  //   if (name && value) {
  //     const newAttributes = [
  //       ...formik.values.customAttributes,
  //       { id: Date.now(), name, value },
  //     ];
  //     formik.setFieldValue("customAttributes", newAttributes);
  //     document.getElementById("attrName").value = "";
  //     document.getElementById("attrValue").value = "";
  //   }
  // };

  // Remove custom attribute
  const removeAttribute = (id) => {
    const updatedAttributes = formik.values.customAttributes.filter(
      (attr) => attr.id !== id
    );
    formik.setFieldValue("customAttributes", updatedAttributes);
  };

  // Normalize select value for parent
  const parentSelectValue = formik.values.parentId || "none";

  return (
    <MasterDrawer
      title={
        mode === "view"
          ? "View Product Category"
          : mode === "edit"
          ? "Edit Product Category"
          : "Add Product Category"
      }
      isOpen={drawerOpen}
      onOpenChange={setDrawerOpen}
      size="lg"
      position="right"
      className="min-w-[450px]"
    >
      <form
        onSubmit={formik.handleSubmit}
        className="space-y-6 p-2 h-full flex flex-col"
      >
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                name="name"
                value={formik.values.name}
                onChange={handleNameChange}
                onBlur={formik.handleBlur}
                placeholder="e.g., Electronics, Clothing, Books"
                className={
                  formik.errors.name && formik.touched.name
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.name && formik.touched.name && (
                <div className="text-red-500 text-sm">{formik.errors.name}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={formik.values.slug}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="e.g., electronics, womens-clothing"
                className={
                  formik.errors.slug && formik.touched.slug
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.slug && formik.touched.slug && (
                <div className="text-red-500 text-sm">{formik.errors.slug}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Brief description of this category"
                rows={3}
                className={
                  formik.errors.description && formik.touched.description
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.description && formik.touched.description && (
                <div className="text-red-500 text-sm">
                  {formik.errors.description}
                </div>
              )}
            </div>
          </div>

          {/* Category Hierarchy */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Category Hierarchy</h3>

            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category</Label>
              <Select
                value={parentSelectValue}
                onValueChange={(value) => {
                  if (value === "none") {
                    formik.setFieldValue("parentId", null);
                    formik.setFieldValue("parentName", null);
                  } else {
                    const selected = existingCategories.find(
                      (c) => c.id === value
                    );
                    if (selected) {
                      formik.setFieldValue("parentId", selected.id);
                      formik.setFieldValue("parentName", selected.name);
                    }
                  }
                }}
                disabled={mode === "view"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No Parent (Root Category)
                  </SelectItem>
                  {existingCategories
                    .filter((category) => category.id !== selectedCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategories Section */}
            <div className="space-y-2">
              <Label>Subcategories</Label>
              {mode !== "view" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a subcategory"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    onKeyPress={handleSubcategoryKeyPress}
                  />
                  <Button type="button" onClick={addSubcategory} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {formik.values.subcategories &&
                formik.values.subcategories.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formik.values.subcategories.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {subcategory.name}
                            </span>
                            <Badge
                              variant={
                                subcategory.isActive ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {subcategory.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Slug: {subcategory.slug}
                          </p>
                        </div>
                        {mode !== "view" && (
                          <X
                            className="h-4 w-4 cursor-pointer text-red-500 hover:text-red-700"
                            onClick={() => removeSubcategory(subcategory)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                value={formik.values.sortOrder}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="0"
                className={
                  formik.errors.sortOrder && formik.touched.sortOrder
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.sortOrder && formik.touched.sortOrder && (
                <div className="text-red-500 text-sm">
                  {formik.errors.sortOrder}
                </div>
              )}
            </div>
          </div>

          {/* Visual & SEO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Visual & SEO</h3>

            {/* Category Banner */}
            <div className="space-y-2">
              <Label>Category Banner</Label>
              {mode !== "view" && (
                <div className="space-y-2">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Banner Image"}
                  </Button>
                </div>
              )}

              {bannerPreview && (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  {mode !== "view" && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setBannerPreview("");
                        setBannerFile(null);
                        formik.setFieldValue("bannerUrl", "");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Category Image</Label>
              <div className="space-y-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />
                {mode !== "view" && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Category Image"}
                    </Button>
                  </div>
                )}
              </div>
              {formik.errors.imageUrl && formik.touched.imageUrl && (
                <div className="text-red-500 text-sm">
                  {formik.errors.imageUrl}
                </div>
              )}
              {imagePreview && (
                <div className="relative mt-2">
                  <img
                    src={imagePreview}
                    alt="Category preview"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  {mode !== "view" && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => {
                        setImagePreview("");
                        setImageFile(null);
                        formik.setFieldValue("imageUrl", "");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* ✅ Additional Banner Images (Gallery) */}
            <div className="space-y-2">
              <Label>Additional Banner Images (Gallery)</Label>

              {mode !== "view" && (
                <div className="space-y-2">
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Multiple Banners"}
                  </Button>
                </div>
              )}

              {galleryPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {galleryPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      {mode !== "view" && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => removeGalleryImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="iconClass">Icon Class</Label>
              <Input
                id="iconClass"
                name="iconClass"
                value={formik.values.iconClass}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="e.g., fas fa-laptop, lucide-smartphone"
                disabled={mode === "view"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Category Color</Label>
              <Input
                id="color"
                name="color"
                type="color"
                value={formik.values.color}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={mode === "view"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
              <Input
                id="metaTitle"
                name="metaTitle"
                value={formik.values.metaTitle}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="SEO optimized title"
                className={
                  formik.errors.metaTitle && formik.touched.metaTitle
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.metaTitle && formik.touched.metaTitle && (
                <div className="text-red-500 text-sm">
                  {formik.errors.metaTitle}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
              <Textarea
                id="metaDescription"
                name="metaDescription"
                value={formik.values.metaDescription}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="SEO meta description (150-160 characters)"
                rows={2}
                className={
                  formik.errors.metaDescription &&
                  formik.touched.metaDescription
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.metaDescription &&
                formik.touched.metaDescription && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.metaDescription}
                  </div>
                )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tags</h3>

            <div className="space-y-2">
              <Label>Category Tags</Label>
              {mode !== "view" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {formik.values.tags && formik.values.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formik.values.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      {mode !== "view" && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Attributes */}
          {/* <div className="space-y-4">
            <h3 className="text-lg font-semibold">Custom Attributes</h3>

            <div className="space-y-2">
              <Label>Add Custom Attributes</Label>
              {mode !== "view" && (
                <div className="flex gap-2">
                  <Input id="attrName" placeholder="Attribute name" />
                  <Input id="attrValue" placeholder="Attribute value" />
                  <Button type="button" onClick={addAttribute} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {formik.values.customAttributes &&
                formik.values.customAttributes.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formik.values.customAttributes.map((attr) => (
                      <div
                        key={attr.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span>
                          <strong>{attr.name}:</strong> {attr.value}
                        </span>
                        {mode !== "view" && (
                          <X
                            className="h-4 w-4 cursor-pointer text-red-500"
                            onClick={() => removeAttribute(attr.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div> */}

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-gray-500">
                  Show this category in the store
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formik.values.isActive}
                onCheckedChange={(checked) =>
                  formik.setFieldValue("isActive", checked)
                }
                disabled={mode === "view"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                name="commissionRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formik.values.commissionRate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="0.00"
                className={
                  formik.errors.commissionRate && formik.touched.commissionRate
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.commissionRate &&
                formik.touched.commissionRate && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.commissionRate}
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formik.values.taxRate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="0.00"
                className={
                  formik.errors.taxRate && formik.touched.taxRate
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.taxRate && formik.touched.taxRate && (
                <div className="text-red-500 text-sm">
                  {formik.errors.taxRate}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">Minimum Order Amount</Label>
              <Input
                id="minOrderAmount"
                name="minOrderAmount"
                type="number"
                step="0.01"
                min="0"
                value={formik.values.minOrderAmount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="0.00"
                className={
                  formik.errors.minOrderAmount && formik.touched.minOrderAmount
                    ? "border-red-500"
                    : ""
                }
                disabled={mode === "view"}
              />
              {formik.errors.minOrderAmount &&
                formik.touched.minOrderAmount && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.minOrderAmount}
                  </div>
                )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="showInMenu">Show in Navigation Menu</Label>
                <p className="text-sm text-gray-500">
                  Display in main navigation
                </p>
              </div>
              <Switch
                id="showInMenu"
                checked={formik.values.showInMenu}
                onCheckedChange={(checked) =>
                  formik.setFieldValue("showInMenu", checked)
                }
                disabled={mode === "view"}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isFeatured">Featured Category</Label>
                <p className="text-sm text-gray-500">Highlight this category</p>
              </div>
              <Switch
                id="isFeatured"
                checked={formik.values.isFeatured}
                onCheckedChange={(checked) =>
                  formik.setFieldValue("isFeatured", checked)
                }
                disabled={mode === "view"}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isSection">Section Category</Label>
                <p className="text-sm text-gray-500">
                  Mark this category as a section (used for section-based UI)
                </p>
              </div>
              <Switch
                id="isSection"
                checked={formik.values.isSection}
                onCheckedChange={(checked) =>
                  formik.setFieldValue("isSection", checked)
                }
                disabled={mode === "view"}
              />
            </div>
          </div>

          {/* Error Display */}
          {formik.errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{formik.errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDrawerOpen(false);
              setBannerFile(null);
              setBannerPreview("");
              setImageFile(null);
              setImagePreview("");
            }}
            disabled={formik.isSubmitting || uploading}
          >
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode !== "view" && (
            <Button type="submit" disabled={formik.isSubmitting || uploading}>
              {formik.isSubmitting
                ? mode === "edit"
                  ? "Updating..."
                  : "Saving..."
                : uploading
                ? "Uploading..."
                : mode === "edit"
                ? "Update Category"
                : "Save Category"}
            </Button>
          )}
        </div>
      </form>
    </MasterDrawer>
  );
};

export default ProductCategoriesModal;
