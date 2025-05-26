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
import { X, Plus } from "lucide-react";
import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    parentId: "",
    sortOrder: 0,
    imageUrl: "",
    iconClass: "",
    color: "#000000",
    metaTitle: "",
    metaDescription: "",
    tags: [],
    customAttributes: [],
    isActive: true,
    showInMenu: true,
    isFeatured: false,
    commissionRate: 0,
    taxRate: 0,
    minOrderAmount: 0,
  };

  // Initialize form values based on mode
  const initialValues =
    mode === "create"
      ? defaultValues
      : { ...defaultValues, ...selectedCategory };

  // Auto-generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const onSubmit = async (values, { setSubmitting, setErrors, resetForm }) => {
    try {
      const categoryData = {
        ...values,
        updatedAt: new Date(),
      };

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
  };

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
      <Formik
        initialValues={initialValues}
        validationSchema={categoryValidationSchema}
        onSubmit={onSubmit}
        enableReinitialize={true}
      >
        {({
          values,
          setFieldValue,
          isSubmitting,
          errors,
          touched,
          handleChange,
          handleBlur,
        }) => {
          // Add tag
          const addTag = () => {
            if (newTag && !values.tags.includes(newTag)) {
              setFieldValue("tags", [...values.tags, newTag]);
              setNewTag("");
            }
          };

          // Remove tag
          const removeTag = (tagToRemove) => {
            const updatedTags = values.tags.filter(
              (tag) => tag !== tagToRemove
            );
            setFieldValue("tags", updatedTags);
          };

          // Handle Enter key for tags
          const handleTagKeyPress = (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          };

          // Handle name change and auto-generate slug
          const handleNameChange = (e) => {
            const name = e.target.value;
            handleChange(e);
            if (!values.slug || values.slug === generateSlug(values.name)) {
              setFieldValue("slug", generateSlug(name));
            }
          };

          //   // Add custom attribute
          //   const addAttribute = () => {
          //     const name = document.getElementById("attrName")?.value;
          //     const value = document.getElementById("attrValue")?.value;

          //     if (name && value) {
          //       const newAttributes = [
          //         ...values.customAttributes,
          //         { id: Date.now(), name, value },
          //       ];
          //       setFieldValue("customAttributes", newAttributes);
          //       document.getElementById("attrName").value = "";
          //       document.getElementById("attrValue").value = "";
          //     }
          //   };

          // Remove custom attribute
          const removeAttribute = (id) => {
            const updatedAttributes = values.customAttributes.filter(
              (attr) => attr.id !== id
            );
            setFieldValue("customAttributes", updatedAttributes);
          };

          return (
            <Form className="space-y-6 p-2 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>

                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name *</Label>
                    <Field name="name">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="name"
                          placeholder="e.g., Electronics, Clothing, Books"
                          onChange={handleNameChange}
                          className={
                            errors.name && touched.name ? "border-red-500" : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Field name="slug">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="slug"
                          placeholder="e.g., electronics, womens-clothing"
                          className={
                            errors.slug && touched.slug ? "border-red-500" : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="slug"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Field name="description">
                      {({ field }) => (
                        <Textarea
                          {...field}
                          id="description"
                          placeholder="Brief description of this category"
                          rows={3}
                          className={
                            errors.description && touched.description
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="description"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                </div>

                {/* Category Hierarchy */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Category Hierarchy</h3>

                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent Category</Label>
                    <Select
                      value={values.parentId}
                      onValueChange={(value) =>
                        setFieldValue("parentId", value)
                      }
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
                          .filter(
                            (category) => category.id !== selectedCategory?.id
                          )
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Field name="sortOrder">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="sortOrder"
                          type="number"
                          placeholder="0"
                          className={
                            errors.sortOrder && touched.sortOrder
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="sortOrder"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                </div>

                {/* Visual & SEO */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Visual & SEO</h3>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Category Image URL</Label>
                    <Field name="imageUrl">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="imageUrl"
                          placeholder="https://example.com/category-image.jpg"
                          className={
                            errors.imageUrl && touched.imageUrl
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="imageUrl"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iconClass">Icon Class</Label>
                    <Field name="iconClass">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="iconClass"
                          placeholder="e.g., fas fa-laptop, lucide-smartphone"
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Category Color</Label>
                    <Field name="color">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="color"
                          type="color"
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
                    <Field name="metaTitle">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="metaTitle"
                          placeholder="SEO optimized title"
                          className={
                            errors.metaTitle && touched.metaTitle
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="metaTitle"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metaDescription">
                      Meta Description (SEO)
                    </Label>
                    <Field name="metaDescription">
                      {({ field }) => (
                        <Textarea
                          {...field}
                          id="metaDescription"
                          placeholder="SEO meta description (150-160 characters)"
                          rows={2}
                          className={
                            errors.metaDescription && touched.metaDescription
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="metaDescription"
                      component="div"
                      className="text-red-500 text-sm"
                    />
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

                    {values.tags && values.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {values.tags.map((tag, index) => (
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Custom Attributes</h3>

                  <div className="space-y-2">
                    <Label>Add Custom Attributes</Label>
                    {mode !== "view" && (
                      <div className="flex gap-2">
                        <Input id="attrName" placeholder="Attribute name" />
                        <Input id="attrValue" placeholder="Attribute value" />
                        {/* <Button type="button" onClick={addAttribute} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button> */}
                      </div>
                    )}

                    {values.customAttributes &&
                      values.customAttributes.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {values.customAttributes.map((attr) => (
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
                </div>

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
                      checked={values.isActive}
                      onCheckedChange={(checked) =>
                        setFieldValue("isActive", checked)
                      }
                      disabled={mode === "view"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                    <Field name="commissionRate">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="commissionRate"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          className={
                            errors.commissionRate && touched.commissionRate
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="commissionRate"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Field name="taxRate">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="taxRate"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          className={
                            errors.taxRate && touched.taxRate
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="taxRate"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">Minimum Order Amount</Label>
                    <Field name="minOrderAmount">
                      {({ field }) => (
                        <Input
                          {...field}
                          id="minOrderAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className={
                            errors.minOrderAmount && touched.minOrderAmount
                              ? "border-red-500"
                              : ""
                          }
                          disabled={mode === "view"}
                        />
                      )}
                    </Field>
                    <ErrorMessage
                      name="minOrderAmount"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showInMenu">
                        Show in Navigation Menu
                      </Label>
                      <p className="text-sm text-gray-500">
                        Display in main navigation
                      </p>
                    </div>
                    <Switch
                      id="showInMenu"
                      checked={values.showInMenu}
                      onCheckedChange={(checked) =>
                        setFieldValue("showInMenu", checked)
                      }
                      disabled={mode === "view"}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="isFeatured">Featured Category</Label>
                      <p className="text-sm text-gray-500">
                        Highlight this category
                      </p>
                    </div>
                    <Switch
                      id="isFeatured"
                      checked={values.isFeatured}
                      onCheckedChange={(checked) =>
                        setFieldValue("isFeatured", checked)
                      }
                      disabled={mode === "view"}
                    />
                  </div>
                </div>
              </div>

              {/* Footer with buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDrawerOpen(false)}
                  disabled={isSubmitting}
                >
                  {mode === "view" ? "Close" : "Cancel"}
                </Button>
                {mode !== "view" && (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? mode === "edit"
                        ? "Updating..."
                        : "Saving..."
                      : mode === "edit"
                      ? "Update Category"
                      : "Save Category"}
                  </Button>
                )}
              </div>
            </Form>
          );
        }}
      </Formik>
    </MasterDrawer>
  );
};

export default ProductCategoriesModal;
