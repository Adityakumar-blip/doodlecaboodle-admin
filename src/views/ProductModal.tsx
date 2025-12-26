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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  collection,
  addDoc,
  getDocs,
  getFirestore,
  updateDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
import { toast } from "sonner";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MultiSelect from "@/components/MultipleSelect";
import TreeMultiSelect, { TreeOption } from "@/components/TreeMultiSelect";

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

const SIZE_OPTIONS = ["Small", "Medium", "Large"];

const validationSchema = Yup.object({
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
        unit: Yup.string().required("Unit is required"),
        priceAdjustment: Yup.number()
          .min(0, "Price adjustment cannot be negative")
          .when("orderType", {
            is: (val) =>
              [ORDER_TYPES.CUSTOM_ORDER, ORDER_TYPES.COMMISSION].includes(val),
            then: (schema) =>
              schema.required("Price adjustment is required for custom sizes"),
            otherwise: (schema) => schema.nullable(),
          }),
      })
    )
    .min(1, "At least one dimension is required"),
  materials: Yup.array()
    .of(Yup.string().required())
    .min(1, "At least one material is required"),
  weight: Yup.number().positive("Weight must be positive"),
  media: Yup.array().min(
    1,
    "At least one media file (image or video) is required"
  ),
  isBestSeller: Yup.boolean(),
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

const ProductModal = ({
  drawerOpen,
  setDrawerOpen,
  onProductAdded,
  editingProduct,
}) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [menuItems, setMenuItems] = useState<TreeOption[]>([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [bannerFiles, setBannerFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [mediaPreviews1, setMediaPreviews1] = useState([]);
  const [variantMediaFiles, setVariantMediaFiles] = useState<
    Record<string, any[]>
  >({});
  const [variantPreviews, setVariantPreviews] = useState<Record<string, any[]>>(
    {}
  );

  const [newMaterial, setNewMaterial] = useState("");
  const [newDescRow, setNewDescRow] = useState({ field: "", value: "" });
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const [newDimension, setNewDimension] = useState({
    name: "",
    length: "",
    width: "",
    height: "",
    unit: "cm",
    priceAdjustment: "",
  });

  const formik: any = useFormik({
    initialValues: {
      sectionCategoryIds: editingProduct?.sectionCategoryIds || [],
      menuManagerCategoryIds: editingProduct?.menuManagerCategoryIds || [],
      isBestSeller: editingProduct?.isBestSeller || false,
      name: editingProduct?.name || "",
      description: editingProduct?.description || "",
      artistId: editingProduct?.artistId || "",
      artistName: editingProduct?.artistName || "",
      price: editingProduct?.price || "",
      slashedPrice: editingProduct?.slashedPrice || "",
      quantity:
        editingProduct?.quantity !== undefined ? editingProduct.quantity : "",
      categoryId: editingProduct?.categoryId || "",
      subcategoryId: editingProduct?.subcategoryId || "",
      orderType: editingProduct?.orderType || ORDER_TYPES.READY_MADE,
      tags: editingProduct?.tags?.join(", ") || "",
      dimensions: editingProduct?.dimensions || [],
      materials: editingProduct?.materials || [],
      weight: editingProduct?.weight || "",
      media: editingProduct?.images || [], // Initialize with existing images
      status: editingProduct?.status || "active",
      descriptionFields: editingProduct?.descriptionFields || [],
      relatedProducts: editingProduct?.relatedProducts || [],
      variants: editingProduct?.variants || [],
      banners: editingProduct?.banners || [],
      customizationOptions: editingProduct?.customizationOptions || {
        allowSizeCustomization: false,
        allowColorCustomization: false,
        allowStyleCustomization: false,
        customizationInstructions: "",
        deliveryTimeframe: "",
      },
    },
    // validationSchema,
    onSubmit: async (values) => {
      await handleAddProduct(values);
    },
    enableReinitialize: true,
  });

  const fetchAllProducts = async () => {
    const snap = await getDocs(collection(db, "products"));
    let items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    if (editingProduct?.id) {
      items = items.filter((p) => p.id !== editingProduct.id);
    }
    setAllProducts(items);
  };

  useEffect(() => {
    fetchCategories();
    fetchArtists();
    fetchAllProducts();
    fetchMenuItems();
    if (editingProduct && editingProduct.images) {
      setMediaPreviews(editingProduct.images);
      setMediaFiles(editingProduct.images); // Initialize mediaFiles with existing images
    }
    if (editingProduct?.banners) {
      setMediaPreviews1(editingProduct.banners);
      setBannerFiles(editingProduct.banners);
    }
  }, [editingProduct]);

  const productOptions = React.useMemo(
    () => allProducts.map((p) => ({ value: p.id, label: p.name })),
    [allProducts]
  );

  useEffect(() => {
    if (formik.values.categoryId) {
      fetchSubcategories(formik.values.categoryId);
      formik.setFieldValue(
        "subcategoryId",
        editingProduct?.subcategoryId || ""
      );
    }
  }, [formik.values.categoryId, editingProduct]);

  const addVariant = () => {
    const id = crypto.randomUUID();
    formik.setFieldValue("variants", [
      ...formik.values.variants,
      {
        id,
        colorName: "",
        colorHex: "#000000",
        sku: "",
        priceAdjustment: "",
        quantity:
          formik.values.orderType === ORDER_TYPES.READY_MADE ? "" : null,
        images: [],
        isDefault: formik.values.variants.length === 0, // first added -> default
      },
    ]);
  };

  const removeVariant = (id: string) => {
    formik.setFieldValue(
      "variants",
      formik.values.variants.filter((v) => v.id !== id)
    );
    setVariantMediaFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setVariantPreviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const setDefaultVariant = (id: string) => {
    const next = formik.values.variants.map((v) => ({
      ...v,
      isDefault: v.id === id,
    }));
    formik.setFieldValue("variants", next);
  };

  const handleVariantMediaChange = (
    variantId: string,
    filesList: FileList | null
  ) => {
    const files = filesList ? Array.from(filesList) : [];
    const previews = files.map((file: any) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setVariantMediaFiles((prev) => ({
      ...prev,
      [variantId]: [...(prev[variantId] || []), ...files],
    }));
    setVariantPreviews((prev) => ({
      ...prev,
      [variantId]: [...(prev[variantId] || []), ...previews],
    }));
  };

  const removeVariantMedia = (variantId: string, index: number) => {
    setVariantMediaFiles((prev) => {
      const next = { ...(prev || {}) };
      next[variantId] = (next[variantId] || []).filter((_, i) => i !== index);
      return next;
    });
    setVariantPreviews((prev) => {
      const next = { ...(prev || {}) };
      next[variantId] = (next[variantId] || []).filter((_, i) => i !== index);
      return next;
    });
  };

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productCategories"));
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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

  const fetchMenuItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "menus"));
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        parentId: doc.data().parentId,
      })) as TreeOption[];
      setMenuItems(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = files.map((file: any) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));

    // If editing, combine existing images with new ones, else use only new ones
    const updatedMedia =
      editingProduct && files.length === 0
        ? [...(editingProduct.images || [])]
        : [...(editingProduct?.images || []), ...files];

    setMediaFiles(updatedMedia);
    setMediaPreviews([...(editingProduct?.images || []), ...newPreviews]);
    formik.setFieldValue("media", updatedMedia);
  };

  const handleBannerChange = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = files.map((file: any) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));

    const current = Array.isArray(formik.values.banners)
      ? formik.values.banners
      : [];

    const updated = [...current, ...files];

    setBannerFiles(updated);
    setMediaPreviews1([...(current || []), ...newPreviews]);
    formik.setFieldValue("banners", updated);
  };

  const removeMedia = (index) => {
    const updatedMediaFiles = mediaFiles.filter((_, i) => i !== index);
    const updatedPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaFiles(updatedMediaFiles);
    setMediaPreviews(updatedPreviews);
    formik.setFieldValue("media", updatedMediaFiles);
  };

  const removeBanner = (index) => {
    const updatedBannerFiles = bannerFiles.filter((_, i) => i !== index);
    const updatedPreviews = mediaPreviews1.filter((_, i) => i !== index);
    setBannerFiles(updatedBannerFiles);
    setMediaPreviews1(updatedPreviews);
    formik.setFieldValue("banners", updatedBannerFiles);
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
    if (newDimension.name && newDimension.length && newDimension.width) {
      const dimension = {
        ...newDimension,
        length: Number(newDimension.length),
        width: Number(newDimension.width),
        height: newDimension.height ? Number(newDimension.height) : null,
        priceAdjustment: newDimension.priceAdjustment
          ? Number(newDimension.priceAdjustment)
          : null,
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
    const uploadPromises = files.map(async (file: any, index) => {
      // Skip if file is already a URL (existing image)
      if (file && file.url) {
        return file;
      }
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
      let mediaUrls = editingProduct?.images || [];
      if (mediaFiles.length > 0) {
        const imageFiles = mediaFiles.filter(
          (file: any) => file && file.type && file.type.startsWith("image/")
        );
        const videoFiles = mediaFiles.filter(
          (file: any) => file && file.type && file.type.startsWith("video/")
        );
        const existingUrls = mediaFiles.filter((file: any) => file && file.url);

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
          ...existingUrls,
          ...cloudinaryUrls.map((url) => ({ url, type: "image" })),
          ...firebaseVideoUrls,
        ];
      }

      let bannerUrls = editingProduct?.banners || [];
      if (bannerFiles.length > 0) {
        const bannerImageFiles = bannerFiles.filter(
          (file) => file && file.type && file.type.startsWith("image/")
        );
        const bannerVideoFiles = bannerFiles.filter(
          (file) => file && file.type && file.type.startsWith("video/")
        );
        const existingBannerUrls = bannerFiles.filter(
          (file) => file && file.url
        );

        let bannerCloudinaryUrls = [];
        if (bannerImageFiles.length > 0) {
          const bannerUploadResult = await uploadImagesToCloudinary(
            bannerImageFiles
          );
          bannerCloudinaryUrls = Array.isArray(bannerUploadResult)
            ? bannerUploadResult
            : [bannerUploadResult];
        }

        const firebaseBannerVideoUrls = bannerVideoFiles.length
          ? await uploadMedia(bannerVideoFiles)
          : [];

        bannerUrls = [
          ...existingBannerUrls,
          ...bannerCloudinaryUrls.map((url) => ({ url, type: "image" })),
          ...firebaseBannerVideoUrls,
        ];
      }

      const uploadedVariantMedia: Record<
        string,
        { url: string; type: "image" | "video" }[]
      > = {};

      for (const v of values.variants || []) {
        const files = variantMediaFiles[v.id] || [];
        if (files.length === 0) {
          uploadedVariantMedia[v.id] = v.images || [];
          continue;
        }
        const imageFiles = files.filter((f: any) =>
          f.type?.startsWith("image/")
        );
        const videoFiles = files.filter((f: any) =>
          f.type?.startsWith("video/")
        );
        const existingUrls = (v.images || []).filter((m: any) => m && m.url);

        let cloudinaryUrls: string[] = [];
        if (imageFiles.length > 0) {
          const up = await uploadImagesToCloudinary(imageFiles);
          cloudinaryUrls = Array.isArray(up) ? up : [up];
        }
        const firebaseVideoUrls = videoFiles.length
          ? await uploadMedia(videoFiles)
          : [];

        uploadedVariantMedia[v.id] = [
          ...existingUrls,
          ...cloudinaryUrls.map((url) => ({ url, type: "image" as const })),
          ...firebaseVideoUrls,
        ];
      }

      const normalizedVariants = (values.variants || []).map((v) => ({
        ...v,
        sku: v.sku || null,
        priceAdjustment: v.priceAdjustment ? Number(v.priceAdjustment) : 0,
        quantity:
          values.orderType === ORDER_TYPES.READY_MADE
            ? v.quantity === "" || v.quantity == null
              ? 0
              : Number(v.quantity)
            : null,
        images: uploadedVariantMedia[v.id] || v.images || [],
      }));

      const selectedArtist = artists.find(
        (artist) => artist.id === values.artistId
      );
      const selectedCategory = categories.find(
        (category) => category.id === values.categoryId
      );
      const productData = {
        ...values,
        price: Number(values.price),
        slashedPrice: values.slashedPrice ? Number(values.slashedPrice) : null,
        quantity:
          values.orderType === ORDER_TYPES.READY_MADE
            ? Number(values.quantity)
            : null,
        weight: values.weight ? Number(values.weight) : null,
        tags: values.tags
          ? values.tags.split(",").map((tag) => tag.trim())
          : [],
        images: mediaUrls,
        banners: bannerUrls,
        variants: normalizedVariants,
        hasColorVariants: (normalizedVariants?.length || 0) > 0,
        artistName: selectedArtist ? selectedArtist.name : "",
        categoryName: selectedCategory?.name,
        createdAt: editingProduct ? editingProduct.createdAt : new Date(),
        updatedAt: new Date(),
        isCustomizable: [
          ORDER_TYPES.CUSTOM_ORDER,
          ORDER_TYPES.COMMISSION,
        ].includes(values.orderType),
      };

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

      let docRef;
      if (editingProduct) {
        docRef = doc(db, "products", editingProduct.id);
        await updateDoc(docRef, productData);
      } else {
        docRef = await addDoc(collection(db, "products"), productData);
      }

      toast.success(
        editingProduct
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      formik.resetForm();
      setMediaFiles([]);
      setMediaPreviews([]);
      setBannerFiles([]);
      setMediaPreviews1([]);
      formik.setFieldValue("banners", []);
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

      if (onProductAdded) {
        onProductAdded({
          id: editingProduct ? editingProduct.id : docRef.id,
          ...productData,
        });
      }
    } catch (error) {
      console.error("Error processing product:", error);
      toast.error(
        editingProduct
          ? "Failed to update product. Please try again."
          : "Failed to add product. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setMediaFiles([]);
    setMediaPreviews([]);
    setBannerFiles([]);
    setMediaPreviews1([]);
    formik.setFieldValue("banners", []);
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

  // ✅ Handlers (put inside component)
  const addDescriptionRow = () => {
    const field = newDescRow.field.trim();
    const value = newDescRow.value.trim();
    if (!field || !value) return;

    // prevent duplicate field names (optional)
    const exists = (formik.values.descriptionFields || []).some(
      (r) => r.field.toLowerCase() === field.toLowerCase()
    );
    if (exists) {
      toast.warning("That field name already exists.");
      return;
    }

    formik.setFieldValue("descriptionFields", [
      ...(formik.values.descriptionFields || []),
      { field, value },
    ]);
    setNewDescRow({ field: "", value: "" });
  };

  const updateDescriptionRow = (
    index: number,
    key: "field" | "value",
    val: string
  ) => {
    const next = [...(formik.values.descriptionFields || [])];
    next[index] = { ...next[index], [key]: val };
    formik.setFieldValue("descriptionFields", next);
  };

  const removeDescriptionRow = (index: number) => {
    const next = (formik.values.descriptionFields || []).filter(
      (_, i) => i !== index
    );
    formik.setFieldValue("descriptionFields", next);
  };

  return (
    <MasterDrawer
      title={editingProduct ? "Edit Product" : "Add New Product"}
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

            <div className="flex items-center space-x-2">
              <Label>Best Seller</Label>
              <Switch
                checked={formik.values.isBestSeller}
                onCheckedChange={(val) =>
                  formik.setFieldValue("isBestSeller", Boolean(val))
                }
              />
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
          </CardContent>
        </Card>

        {/* ✅ UI section for Dynamic Description (place among your <Card>s) */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Row */}
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Label>Field Name</Label>
                <Input
                  placeholder="e.g., Medium, Year, Style"
                  value={newDescRow.field}
                  onChange={(e) =>
                    setNewDescRow((r) => ({ ...r, field: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-6">
                <Label>Value</Label>
                <Input
                  placeholder="e.g., Oil on Canvas"
                  value={newDescRow.value}
                  onChange={(e) =>
                    setNewDescRow((r) => ({ ...r, value: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      addDescriptionRow();
                    }
                  }}
                />
              </div>
              <div className="col-span-1 flex">
                <Button
                  type="button"
                  size="sm"
                  onClick={addDescriptionRow}
                  aria-label="Add"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Existing Rows */}
            <div className="space-y-2">
              {(formik.values.descriptionFields || []).map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded p-2"
                >
                  <div className="col-span-5">
                    <Input
                      value={row.field}
                      onChange={(e) =>
                        updateDescriptionRow(index, "field", e.target.value)
                      }
                      placeholder="Field"
                    />
                  </div>
                  <div className="col-span-6">
                    <Input
                      value={row.value}
                      onChange={(e) =>
                        updateDescriptionRow(index, "value", e.target.value)
                      }
                      placeholder="Value"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDescriptionRow(index)}
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {formik.touched.descriptionFields &&
              formik.errors.descriptionFields && (
                <p className="text-red-500 text-sm mt-1">
                  {/* @ts-ignore */}
                  {typeof formik.errors.descriptionFields === "string"
                    ? formik.errors.descriptionFields
                    : "Please fix the highlighted description rows."}
                </p>
              )}
          </CardContent>
        </Card>

        {/* Order Type */}
        <Card>
          <CardHeader>
            <CardTitle>Order Type *</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formik.values.orderType}
              onValueChange={(value) =>
                formik.setFieldValue("orderType", value)
              }
              className="grid grid-cols-2 gap-4"
            >
              {Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={value} />
                  <Label htmlFor={value} className="cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formik.touched.orderType && formik.errors.orderType && (
              <p className="text-red-500 text-sm mt-1">
                {formik.errors.orderType}
              </p>
            )}

            <div className="mt-4 text-sm text-gray-600">
              {formik.values.orderType === ORDER_TYPES.READY_MADE && (
                <p>✓ Pre-made artwork ready to ship immediately</p>
              )}
              {formik.values.orderType === ORDER_TYPES.CUSTOM_ORDER && (
                <p>
                  ✓ Made to order with customer specifications (size, colors,
                  etc.)
                </p>
              )}
              {formik.values.orderType === ORDER_TYPES.PRINT_ON_DEMAND && (
                <p>✓ Digital artwork printed when ordered</p>
              )}
              {formik.values.orderType === ORDER_TYPES.COMMISSION && (
                <p>✓ Fully custom commissioned artwork created from scratch</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  value={formik.values.categoryId}
                  onValueChange={(value) =>
                    formik.setFieldValue("categoryId", value)
                  }
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
                  disabled={!formik.values.categoryId}
                >
                  <SelectTrigger
                    className={
                      formik.touched.subcategoryId &&
                      formik.errors.subcategoryId
                        ? "border-red-500"
                        : ""
                    }
                  >
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
                {formik.touched.subcategoryId &&
                  formik.errors.subcategoryId && (
                    <p className="text-red-500 text-sm mt-1">
                      {formik.errors.subcategoryId}
                    </p>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections (multi-select for categories with isSection = true) */}
        <Card>
          <CardHeader>
            <CardTitle>Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Sections (choose one or more)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full text-left">
                    {formik.values.sectionCategoryIds &&
                    formik.values.sectionCategoryIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formik.values.sectionCategoryIds.map((id) => {
                          const cat = categories.find((c) => c.id === id);
                          return (
                            <Badge key={id} variant="secondary">
                              {cat ? cat.name : id}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Select sections
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {categories
                      .filter((c) => c.isSection)
                      .map((category) => {
                        const checked =
                          formik.values.sectionCategoryIds.includes(
                            category.id
                          );
                        return (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(val) => {
                                const next = new Set(
                                  formik.values.sectionCategoryIds || []
                                );
                                if (val) next.add(category.id);
                                else next.delete(category.id);
                                formik.setFieldValue(
                                  "sectionCategoryIds",
                                  Array.from(next)
                                );
                              }}
                            />
                            <span>{category.name}</span>
                          </label>
                        );
                      })}
                    {categories.filter((c) => c.isSection).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No sections available
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Menu Manager Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="mb-2 block">Select menu categories for this product</Label>
              <TreeMultiSelect
                options={menuItems}
                value={formik.values.menuManagerCategoryIds || []}
                onChange={(vals) => formik.setFieldValue("menuManagerCategoryIds", vals)}
                placeholder="Select menu categories..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Base Price ($) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
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
              <div>
                <Label htmlFor="slashedPrice">Slashed Price ($)</Label>
                <Input
                  id="slashedPrice"
                  name="slashedPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formik.values.slashedPrice}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={
                    formik.touched.slashedPrice && formik.errors.slashedPrice
                      ? "border-red-500"
                      : ""
                  }
                />
                {formik.touched.slashedPrice && formik.errors.slashedPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.slashedPrice}
                  </p>
                )}
              </div>
              {formik.values.orderType === ORDER_TYPES.READY_MADE && (
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    placeholder="0"
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
                  step="0.01"
                  placeholder="0.00"
                  value={formik.values.weight}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
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
                  onValueChange={(value) =>
                    setNewDimension({ ...newDimension, name: value })
                  }
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
              {isCustomOrder && (
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
              )}
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
                    {isCustomOrder &&
                      dimension.priceAdjustment != null &&
                      ` (+$${dimension.priceAdjustment})`}
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

        <Card>
          <CardHeader>
            <CardTitle>Color Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" onClick={addVariant} size="sm">
                <Plus className="h-4 w-4" /> Add Color
              </Button>
            </div>

            {formik.values.variants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No color variants yet.
              </p>
            )}

            <div className="space-y-3">
              {formik.values.variants.map((v, idx) => (
                <div key={v.id} className="rounded border p-3 space-y-3">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <Label>Color Name *</Label>
                      <Input
                        value={v.colorName}
                        onChange={(e) => {
                          const next = [...formik.values.variants];
                          next[idx] = {
                            ...next[idx],
                            colorName: e.target.value,
                          };
                          formik.setFieldValue("variants", next);
                        }}
                        placeholder="e.g., Red"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Color HEX *</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={v.colorHex || "#000000"}
                          onChange={(e) => {
                            const next = [...formik.values.variants];
                            next[idx] = {
                              ...next[idx],
                              colorHex: e.target.value,
                            };
                            formik.setFieldValue("variants", next);
                          }}
                          className="h-9 w-12 rounded border"
                        />
                        <Input
                          value={v.colorHex}
                          onChange={(e) => {
                            const next = [...formik.values.variants];
                            next[idx] = {
                              ...next[idx],
                              colorHex: e.target.value,
                            };
                            formik.setFieldValue("variants", next);
                          }}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>SKU</Label>
                      <Input
                        value={v.sku || ""}
                        onChange={(e) => {
                          const next = [...formik.values.variants];
                          next[idx] = { ...next[idx], sku: e.target.value };
                          formik.setFieldValue("variants", next);
                        }}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Price + ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={v.priceAdjustment ?? ""}
                        onChange={(e) => {
                          const next = [...formik.values.variants];
                          next[idx] = {
                            ...next[idx],
                            priceAdjustment: e.target.value,
                          };
                          formik.setFieldValue("variants", next);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    {formik.values.orderType === ORDER_TYPES.READY_MADE && (
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={v.quantity ?? ""}
                          onChange={(e) => {
                            const next = [...formik.values.variants];
                            next[idx] = {
                              ...next[idx],
                              quantity: e.target.value,
                            };
                            formik.setFieldValue("variants", next);
                          }}
                          placeholder="0"
                        />
                      </div>
                    )}
                    <div className="col-span-1 flex items-center gap-2">
                      <Checkbox
                        checked={!!v.isDefault}
                        onCheckedChange={() => setDefaultVariant(v.id)}
                        id={`default-${v.id}`}
                      />
                      <Label htmlFor={`default-${v.id}`}>Default</Label>
                    </div>
                    <div className="col-span-12 flex justify-between">
                      <div className="space-y-2 w-full">
                        <Label>Variant Media</Label>
                        <Input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/gif,video/mp4,video/webm,video/ogg"
                          onChange={(e) =>
                            handleVariantMediaChange(v.id, e.target.files)
                          }
                          className="cursor-pointer"
                        />
                        {(variantPreviews[v.id]?.length || v.images?.length) > 0 && (
                          <div className="grid grid-cols-3 gap-3 mt-2">
                            {/* Show already uploaded images/videos */}
                            {Array.isArray(v.images) && v.images.map((img, i) => (
                              <div key={"uploaded-" + i} className="relative">
                                {img.type === "image" ? (
                                  <img
                                    src={img.url}
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                ) : (
                                  <video
                                    src={img.url}
                                    controls
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-1 right-1 bg-gray-800/60"
                                  onClick={() => {
                                    // Remove from v.images on save
                                    const nextVariants = formik.values.variants.map(variant => {
                                      if (variant.id === v.id) {
                                        return {
                                          ...variant,
                                          images: variant.images.filter((_, idx) => idx !== i)
                                        };
                                      }
                                      return variant;
                                    });
                                    formik.setFieldValue("variants", nextVariants);
                                  }}
                                >
                                  <X className="h-4 w-4 text-white" />
                                </Button>
                              </div>
                            ))}
                            {/* Show new previews */}
                            {variantPreviews[v.id]?.map((p, i) => (
                              <div key={"preview-" + i} className="relative">
                                {p.type === "image" ? (
                                  <img
                                    src={p.url}
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                ) : (
                                  <video
                                    src={p.url}
                                    controls
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-1 right-1 bg-gray-800/60"
                                  onClick={() => removeVariantMedia(v.id, i)}
                                >
                                  <X className="h-4 w-4 text-white" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(v.id)}
                        className="self-start ml-2"
                        aria-label="Remove variant"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

        {/* UI: DropdownMenu multi-select (scrollable) */}
        <Card>
          <CardHeader>
            <CardTitle>Related Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Choose related products</Label>
            <MultiSelect
              options={productOptions}
              value={formik.values.relatedProducts}
              onChange={(next) => formik.setFieldValue("relatedProducts", next)}
              placeholder="Select related products"
            />
          </CardContent>
        </Card>

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

        {/* <Card>
          <CardHeader>
            <CardTitle>Product Banners</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="banner">Upload Images or Videos</Label>
              <Input
                id="banner"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,video/mp4,video/webm,video/ogg"
                onChange={handleBannerChange}
                className="cursor-pointer"
              />
              {formik.touched.banners && formik.errors.banners && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.banners}
                </p>
              )}
            </div>

            {mediaPreviews1.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {mediaPreviews1.map((preview, index) => (
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 bg-gray-800 bg-opacity-50"
                      onClick={() => removeBanner(index)}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle>Product Media *</CardTitle>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 bg-gray-800 bg-opacity-50"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
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

export default ProductModal;
