/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { collection, addDoc, getDocs, getFirestore } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
import { toast } from "sonner";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";

const db = getFirestore();
const storage = getStorage();

const ORDER_TYPES = {
  READY_MADE: "ready_made",
  CUSTOM_ORDER: "custom_order",
  PRINT_ON_DEMAND: "print_on_demand",
  COMMISSION: "commission",
};

const ORDER_TYPE_LABELS = {
  [ORDER_TYPES.READY_MADE]: "Ready Made",
  [ORDER_TYPES.CUSTOM_ORDER]: "Custom Order",
  [ORDER_TYPES.PRINT_ON_DEMAND]: "Print on Demand",
  [ORDER_TYPES.COMMISSION]: "Commission",
};

const SIZE_OPTIONS = ["Small", "Medium", "Large", "A5", "A4", "A3"];

// Define standard dimensions for A5, A4, A3 in millimeters
const STANDARD_DIMENSIONS = {
  A5: { length: 148, width: 210, unit: "mm" },
  A4: { length: 210, width: 297, unit: "mm" },
  A3: { length: 297, width: 420, unit: "mm" },
};

const validationSchema = (isEditing: boolean) =>
  Yup.object({
    name: Yup.string()
      .min(2, "Product name must be at least 2 characters")
      .required("Product name is required"),
    description: Yup.string()
      .min(10, "Description must be at least 10 characters")
      .required("Description is required"),
    artistId: Yup.string().required("Artist is required"),
    price: Yup.number()
      .positive("Price must be positive")
      .required("Price is required"),
    quantity: Yup.number()
      .integer("Quantity must be a whole number")
      .min(0, "Quantity cannot be negative")
      .when("orderType", {
        is: ORDER_TYPES.READY_MADE,
        then: (schema) =>
          schema.required("Quantity is required for ready-made products"),
        otherwise: (schema) => schema.nullable(),
      }),
    categoryId: Yup.string().required("Category is required"),
    orderType: Yup.string()
      .oneOf(Object.values(ORDER_TYPES), "Invalid order type")
      .required("Order type is required"),
    tags: Yup.string(),
    dimensions: Yup.array()
      .of(
        Yup.object({
          name: Yup.string().required("Dimension name is required"),
          length: Yup.number()
            .positive("Length must be positive")
            .required("Length is required"),
          width: Yup.number()
            .positive("Width must be positive")
            .required("Width is required"),
          height: Yup.number().positive("Height must be positive"),
          unit: Yup.string().required("Unit is required"),
          priceAdjustment: Yup.number()
            .min(0, "Price adjustment cannot be negative")
            .required("Price adjustment is required for all sizes"),
        })
      )
      .min(1, "At least one dimension is required"),
    materials: Yup.array()
      .of(Yup.string().required())
      .min(1, "At least one material is required"),
    // weight: Yup.number().positive("Weight must be positive"),
    media: isEditing
      ? Yup.array().nullable()
      : Yup.array()
          .min(1, "At least one media file (image or video) is required")
          .test(
            "file-size",
            "Each file must be less than 100MB",
            (files) =>
              !files ||
              files.every((file: File) => file.size <= 100 * 1024 * 1024)
          )
          .test(
            "file-type",
            "Only image (JPEG, PNG, GIF) or video (MP4, WEBM, OGG) files are allowed",
            (files) =>
              !files ||
              files.every((file: File) =>
                [
                  "image/jpeg",
                  "image/png",
                  "image/gif",
                  "video/mp4",
                  "video/webm",
                  "video/ogg",
                ].includes(file.type)
              )
          ),
    customizationOptions: Yup.object().when("orderType", {
      is: (val) =>
        [ORDER_TYPES.CUSTOM_ORDER, ORDER_TYPES.COMMISSION].includes(val),
      then: (schema) =>
        schema.shape({
          allowSizeCustomization: Yup.boolean(),
          allowColorCustomization: Yup.boolean(),
          allowStyleCustomization: Yup.boolean(),
          customizationInstructions: Yup.string(),
          deliveryTimeframe: Yup.string().required(
            "Delivery timeframe is required for custom orders"
          ),
        }),
      otherwise: (schema) => schema.nullable(),
    }),
  });

interface WorkModalProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onProductAdded: (product: any) => void;
  editingProduct?: any;
}

const WorkModal = ({
  drawerOpen,
  setDrawerOpen,
  onProductAdded,
  editingProduct,
}: WorkModalProps) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState<any[]>([]);

  const [newMaterial, setNewMaterial] = useState("");
  const [newDimension, setNewDimension] = useState({
    name: "",
    length: "",
    width: "",
    height: "",
    unit: "cm",
    priceAdjustment: "",
  });

  const formik: any = useFormik({
    initialValues: editingProduct
      ? {
          ...editingProduct,
          tags: editingProduct.tags ? editingProduct.tags.join(", ") : "",
          media: [],
          customizationOptions: {
            allowSizeCustomization:
              editingProduct.customizationOptions?.allowSizeCustomization ||
              false,
            allowColorCustomization:
              editingProduct.customizationOptions?.allowColorCustomization ||
              false,
            allowStyleCustomization:
              editingProduct.customizationOptions?.allowStyleCustomization ||
              false,
            customizationInstructions:
              editingProduct.customizationOptions?.customizationInstructions ||
              "",
            deliveryTimeframe:
              editingProduct.customizationOptions?.deliveryTimeframe || "",
          },
        }
      : {
          name: "",
          description: "",
          artistId: "",
          artistName: "",
          price: "",
          quantity: "",
          categoryId: "",
          category: "",
          subcategoryId: "",
          orderType: ORDER_TYPES.READY_MADE,
          tags: "",
          dimensions: [],
          materials: [],
          weight: "",
          media: [],
          status: "active",
          customizationOptions: {
            allowSizeCustomization: false,
            allowColorCustomization: false,
            allowStyleCustomization: false,
            customizationInstructions: "",
            deliveryTimeframe: "",
          },
        },
    validationSchema: validationSchema(!!editingProduct),
    onSubmit: async (values) => {
      await handleAddProduct(values);
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    fetchCategories();
    fetchArtists();
    if (editingProduct) {
      setMediaPreviews(editingProduct.images || []);
      setMediaFiles(editingProduct.images || []);
    } else {
      setMediaPreviews([]);
      setMediaFiles([]);
    }
  }, [editingProduct]);

  useEffect(() => {
    if (formik.values.categoryId) {
      fetchSubcategories(formik.values.categoryId);
      if (!editingProduct) {
        formik.setFieldValue("subcategoryId", "");
      }
    }
  }, [formik.values.categoryId]);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productCategories"));
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        name: doc.data().name,
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const querySnapshot = await getDocs(
        collection(db, "categories", categoryId, "subcategories")
      );
      const subcategoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubcategories(subcategoriesData);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      toast.error("Failed to load subcategories");
    }
  };

  const fetchArtists = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "artists"));
      const artistsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setArtists(artistsData);
    } catch (error) {
      console.error("Error fetching artists:", error);
      toast.error("Failed to load artists");
    }
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    setMediaFiles(files);

    const previews = files.map((file: any) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setMediaPreviews(previews);

    formik.setFieldValue("media", files);
  };

  const addMaterial = () => {
    if (
      newMaterial.trim() &&
      !formik.values.materials.includes(newMaterial.trim())
    ) {
      formik.setFieldValue("materials", [
        ...formik.values.materials,
        newMaterial.trim(),
      ]);
      setNewMaterial("");
    }
  };

  const removeMaterial = (index) => {
    const updatedMaterials = formik.values.materials.filter(
      (_, i) => i !== index
    );
    formik.setFieldValue("materials", updatedMaterials);
  };

  const addDimension = () => {
    console.log(newDimension);
    if (newDimension.name && newDimension.length && newDimension.width) {
      const dimension = {
        ...newDimension,
        length: Number(newDimension.length),
        width: Number(newDimension.width),
        height: newDimension.height ? Number(newDimension.height) : "",
        unit: newDimension.unit,
        priceAdjustment: Number(newDimension.priceAdjustment),
      };
      formik.setFieldValue("dimensions", [
        ...formik.values.dimensions,
        dimension,
      ]);
      setNewDimension({
        name: "",
        length: "",
        width: "",
        height: "",
        unit: "cm",
        priceAdjustment: "",
      });
    }
  };

  const removeDimension = (index) => {
    const updatedDimensions = formik.values.dimensions.filter(
      (_, i) => i !== index
    );
    formik.setFieldValue("dimensions", updatedDimensions);
  };

  const uploadMedia = async (files) => {
    const uploadPromises = files.map(async (file: File, index) => {
      const fileRef = ref(
        storage,
        `products/${Date.now()}_${index}_${file.name}`
      );
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return {
        url,
        type: file.type.startsWith("video/") ? "video" : "image",
      };
    });
    return await Promise.all(uploadPromises);
  };

  const handleAddProduct = async (values) => {
    setLoading(true);
    try {
      let mediaUrls = [];
      if (mediaFiles.length > 0 && mediaFiles[0]?.url) {
        // If mediaFiles contains existing images (from editingProduct)
        mediaUrls = mediaFiles;
      } else if (mediaFiles.length > 0) {
        // New files uploaded
        const imageFiles = mediaFiles.filter((file: File) =>
          file.type?.startsWith("image/")
        );
        const videoFiles = mediaFiles.filter((file: File) =>
          file.type?.startsWith("video/")
        );

        let cloudinaryUrls = [];
        if (imageFiles.length > 0) {
          const uploadResult = await uploadImagesToCloudinary(imageFiles);
          cloudinaryUrls = Array.isArray(uploadResult)
            ? uploadResult
            : [uploadResult];
        }

        const firebaseVideoUrls = videoFiles.length
          ? await uploadMedia(videoFiles)
          : [];

        mediaUrls = [
          ...cloudinaryUrls.map((url) => ({ url, type: "image" })),
          ...firebaseVideoUrls,
        ];
      } else if (editingProduct) {
        // No new files, use existing images
        mediaUrls = editingProduct.images || [];
      }

      const selectedArtist = artists.find(
        (artist) => artist.id === values.artistId
      );
      const selectedCategory = categories.find(
        (category) => category.id === values.categoryId
      );
      const productData = {
        ...values,
        price: Number(values.price),
        quantity:
          values.orderType === ORDER_TYPES.READY_MADE
            ? Number(values.quantity)
            : null,
        weight: values.weight ? Number(values.weight) : null,
        tags: values.tags
          ? values.tags.split(",").map((tag) => tag.trim())
          : [],
        images: mediaUrls,
        artistName: selectedArtist ? selectedArtist.name : "",
        category: selectedCategory ? selectedCategory.name : "",
        createdAt: editingProduct ? values.createdAt : new Date(),
        updatedAt: new Date(),
        isCustomizable: [
          ORDER_TYPES.CUSTOM_ORDER,
          ORDER_TYPES.COMMISSION,
        ].includes(values.orderType),
      };

      productData.dimensions = values.dimensions.map((dim) => ({
        name: dim.name,
        length: dim.length,
        width: dim.width,
        height: dim.height,
        unit: dim.unit,
        priceAdjustment: dim.priceAdjustment || 0,
      }));

      if (
        [ORDER_TYPES.CUSTOM_ORDER, ORDER_TYPES.COMMISSION].includes(
          values.orderType
        )
      ) {
        productData.customizationOptions = {
          ...values.customizationOptions,
          availableSizes: values.dimensions.map((dim) => ({
            name: dim.name,
            length: dim.length,
            width: dim.width,
            height: dim.height,
            unit: dim.unit,
            priceAdjustment: dim.priceAdjustment || 0,
          })),
        };
      }

      delete productData.media;

      if (editingProduct) {
        onProductAdded({ id: editingProduct.id, ...productData });
      } else {
        const docRef = await addDoc(collection(db, "ourworks"), productData);
        onProductAdded({ id: docRef.id, ...productData });
      }

      toast.success(
        editingProduct
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      formik.resetForm();
      setMediaFiles([]);
      setMediaPreviews([]);
      setNewMaterial("");
      setNewDimension({
        name: "",
        length: "",
        width: "",
        height: "",
        unit: "cm",
        priceAdjustment: "",
      });
      setDrawerOpen(false);
    } catch (error) {
      console.error("Error adding/updating product:", error);
      toast.error("Failed to add/update product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setMediaFiles([]);
    setMediaPreviews([]);
    setNewMaterial("");
    setNewDimension({
      name: "",
      length: "",
      width: "",
      height: "",
      unit: "cm",
      priceAdjustment: "",
    });
    setDrawerOpen(false);
  };

  const isCustomOrder = [
    ORDER_TYPES.CUSTOM_ORDER,
    ORDER_TYPES.COMMISSION,
  ].includes(formik.values.orderType);

  // Handle size selection for A5, A4, A3
  const handleSizeChange = (value: string) => {
    const standardSize =
      STANDARD_DIMENSIONS[value as keyof typeof STANDARD_DIMENSIONS];
    if (standardSize) {
      setNewDimension({
        ...newDimension,
        name: value,
        length: standardSize.length.toString(),
        width: standardSize.width.toString(),
        unit: standardSize.unit,
      });
    } else {
      setNewDimension({
        ...newDimension,
        name: value,
        length: "",
        width: "",
        unit: "cm",
      });
    }
  };

  return (
    <MasterDrawer
      title={editingProduct ? "Edit Work" : "Add New Work"}
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
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : editingProduct
              ? "Update Product"
              : "Save Product"}
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
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter product name"
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
              <Label htmlFor="artistId">Artist *</Label>
              <Select
                value={formik.values.artistId}
                onValueChange={(value) => {
                  const selectedArtist = artists.find(
                    (artist) => artist.id === value
                  );
                  formik.setFieldValue("artistId", value);
                  formik.setFieldValue(
                    "artistName",
                    selectedArtist ? selectedArtist.name : ""
                  );
                }}
              >
                <SelectTrigger
                  className={
                    formik.touched.artistId && formik.errors.artistId
                      ? "border-red-500"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select artist" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.artistId && formik.errors.artistId && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.artistId}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                value={formik.values.categoryId}
                onValueChange={(value) => {
                  const selectedCategory = categories.find(
                    (category) => category.id === value
                  );
                  formik.setFieldValue("categoryId", value);
                  formik.setFieldValue(
                    "category",
                    selectedCategory ? selectedCategory.name : ""
                  );
                }}
              >
                <SelectTrigger
                  className={
                    formik.touched.categoryId && formik.errors.categoryId
                      ? "border-red-500"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.categoryId && formik.errors.categoryId && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.categoryId}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="subcategoryId">Subcategory</Label>
              <Select
                value={formik.values.subcategoryId}
                onValueChange={(value) =>
                  formik.setFieldValue("subcategoryId", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your artwork..."
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
              <Label htmlFor="price">Base Price ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                placeholder="Enter base price"
                value={formik.values.price}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.price && formik.errors.price
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.price && formik.errors.price && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.price}
                </p>
              )}
            </div>

            {formik.values.orderType === ORDER_TYPES.READY_MADE && (
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={formik.values.quantity}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={
                    formik.touched.quantity && formik.errors.quantity
                      ? "border-red-500"
                      : ""
                  }
                />
                {formik.touched.quantity && formik.errors.quantity && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.quantity}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                placeholder="Enter weight"
                value={formik.values.weight}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.weight && formik.errors.weight
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.weight && formik.errors.weight && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.weight}
                </p>
              )}
            </div>

            <div>
              <Label>Order Type *</Label>
              <RadioGroup
                name="orderType"
                value={formik.values.orderType}
                onValueChange={(value) =>
                  formik.setFieldValue("orderType", value)
                }
                className="grid grid-cols-2 gap-4"
              >
                {Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={value} />
                    <Label htmlFor={value}>{label}</Label>
                  </div>
                ))}
              </RadioGroup>
              {formik.touched.orderType && formik.errors.orderType && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.orderType}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dimensions */}
        <Card>
          <CardHeader>
            <CardTitle>Dimensions *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-6 gap-2 items-end">
              <div>
                <Label>Size *</Label>
                <Select
                  value={newDimension.name}
                  onValueChange={handleSizeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((size) => (
                      <SelectItem
                        key={size}
                        value={size}
                        disabled={formik.values.dimensions.some(
                          (dim) => dim.name === size
                        )}
                      >
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={newDimension.length}
                  onChange={(e) =>
                    setNewDimension({ ...newDimension, length: e.target.value })
                  }
                  disabled={["A5", "A4", "A3"].includes(newDimension.name)}
                />
              </div>
              <div>
                <Label>Width</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={newDimension.width}
                  onChange={(e) =>
                    setNewDimension({ ...newDimension, width: e.target.value })
                  }
                  disabled={["A5", "A4", "A3"].includes(newDimension.name)}
                />
              </div>
              <div>
                <Label>Height</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={newDimension.height}
                  onChange={(e) =>
                    setNewDimension({ ...newDimension, height: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={newDimension.unit}
                  onValueChange={(value) =>
                    setNewDimension({ ...newDimension, unit: value })
                  }
                  disabled={["A5", "A4", "A3"].includes(newDimension.name)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="inch">inch</SelectItem>
                    <SelectItem value="mm">mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price Adjustment ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newDimension.priceAdjustment}
                  onChange={(e) =>
                    setNewDimension({
                      ...newDimension,
                      priceAdjustment: e.target.value,
                    })
                  }
                />
              </div>
              <Button type="button" onClick={addDimension} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {formik.values.dimensions.map((dimension, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                >
                  <span className="font-medium">{dimension.name}:</span>
                  <span>
                    {dimension.length} × {dimension.width}{" "}
                    {dimension.height && `× ${dimension.height}`}{" "}
                    {dimension.unit}
                    {` (+$${dimension.priceAdjustment})`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDimension(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {formik.touched.dimensions && formik.errors.dimensions && (
              <p className="text-red-500 text-sm">{formik.errors.dimensions}</p>
            )}
          </CardContent>
        </Card>

        {/* Materials */}
        <Card>
          <CardHeader>
            <CardTitle>Materials *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Oil paint, Canvas, Acrylic..."
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addMaterial())
                }
              />
              <Button type="button" onClick={addMaterial} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formik.values.materials.map((material, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {material}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeMaterial(index)}
                  />
                </Badge>
              ))}
            </div>
            {formik.touched.materials && formik.errors.materials && (
              <p className="text-red-500 text-sm">{formik.errors.materials}</p>
            )}
          </CardContent>
        </Card>

        {/* Customization Options */}
        {isCustomOrder && (
          <Card>
            <CardHeader>
              <CardTitle>Customization Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowSizeCustomization"
                    checked={
                      formik.values.customizationOptions.allowSizeCustomization
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        "customizationOptions.allowSizeCustomization",
                        e.target.checked
                      )
                    }
                  />
                  <Label htmlFor="allowSizeCustomization">
                    Allow Size Customization
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowColorCustomization"
                    checked={
                      formik.values.customizationOptions.allowColorCustomization
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        "customizationOptions.allowColorCustomization",
                        e.target.checked
                      )
                    }
                  />
                  <Label htmlFor="allowColorCustomization">
                    Allow Color Customization
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowStyleCustomization"
                    checked={
                      formik.values.customizationOptions.allowStyleCustomization
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        "customizationOptions.allowStyleCustomization",
                        e.target.checked
                      )
                    }
                  />
                  <Label htmlFor="allowStyleCustomization">
                    Allow Style Customization
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="deliveryTimeframe">Delivery Timeframe *</Label>
                <Select
                  value={formik.values.customizationOptions.deliveryTimeframe}
                  onValueChange={(value) =>
                    formik.setFieldValue(
                      "customizationOptions.deliveryTimeframe",
                      value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-3 days">1-3 days</SelectItem>
                    <SelectItem value="1 week">1 week</SelectItem>
                    <SelectItem value="2 weeks">2 weeks</SelectItem>
                    <SelectItem value="3-4 weeks">3-4 weeks</SelectItem>
                    <SelectItem value="1-2 months">1-2 months</SelectItem>
                    <SelectItem value="2+ months">2+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="customizationInstructions">
                  Customization Instructions
                </Label>
                <Textarea
                  id="customizationInstructions"
                  placeholder="Provide instructions for customers on how to request customizations..."
                  value={
                    formik.values.customizationOptions.customizationInstructions
                  }
                  onChange={(e) =>
                    formik.setFieldValue(
                      "customizationOptions.customizationInstructions",
                      e.target.value
                    )
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="e.g., abstract, modern, colorful, landscape..."
                value={formik.values.tags}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle>Product Media {editingProduct ? "" : "*"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="media">Upload Images or Videos</Label>
              <Input
                id="media"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,video/mp4,video/webm,video/ogg"
                onChange={handleMediaChange}
                className="cursor-pointer"
              />
              {formik.touched.media && formik.errors.media && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.media}
                </p>
              )}
            </div>

            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    {preview.type === "image" ? (
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ) : (
                      <video
                        src={preview.url}
                        controls
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default WorkModal;
