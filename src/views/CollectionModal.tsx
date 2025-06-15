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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Search, X, Package, Star, Calendar, Plus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  collection,
  addDoc,
  getDocs,
  getFirestore,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
import { toast } from "sonner";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";

const db = getFirestore();
const storage = getStorage();

const COLLECTION_TYPES = {
  FEATURED: "featured",
  STYLE: "style",
  OCCASION: "occasion",
};

const STYLE_TYPES = [
  "modern",
  "bohemian",
  "classic",
  "minimalist",
  "vintage",
  "industrial",
  "scandinavian",
  "coastal",
];

const validationSchema = Yup.object({
  name: Yup.string()
    .min(2, "Collection name must be at least 2 characters")
    .required("Collection name is required"),
  description: Yup.string()
    .min(10, "Description must be at least 10 characters")
    .required("Description is required"),
  collectionType: Yup.string()
    .oneOf(Object.values(COLLECTION_TYPES))
    .required("Collection type is required"),
  occasions: Yup.array().when("collectionType", {
    is: COLLECTION_TYPES.OCCASION,
    then: (schema) => schema.min(1, "At least one occasion must be selected"),
    otherwise: (schema) => schema,
  }),
  styles: Yup.array().when("collectionType", {
    is: COLLECTION_TYPES.STYLE,
    then: (schema) => schema.min(1, "At least one style must be selected"),
    otherwise: (schema) => schema,
  }),
  products: Yup.array().min(1, "At least one product must be selected"),
  coverImage: Yup.mixed().required("Cover image is required"),
  startDate: Yup.date().nullable(),
  endDate: Yup.date()
    .nullable()
    .when("startDate", {
      is: (startDate) => startDate,
      then: (schema) =>
        schema.min(Yup.ref("startDate"), "End date must be after start date"),
      otherwise: (schema) => schema.nullable(),
    }),
});

const CollectionModal = ({ drawerOpen, setDrawerOpen, onCollectionAdded }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 10;

  const formik: any = useFormik({
    initialValues: {
      name: "",
      description: "",
      collectionType: COLLECTION_TYPES.FEATURED,
      occasions: [],
      styles: [],
      products: [],
      isFeatured: false,
      isActive: true,
      coverImage: null,
      startDate: "",
      endDate: "",
      sortOrder: 0,
      seoTitle: "",
      seoDescription: "",
      tags: "",
      discountPercentage: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleCreateCollection(values);
    },
  });

  // Fetch products and occasions on component mount
  useEffect(() => {
    fetchProducts();
    fetchOccasions();
  }, []);

  // Filter and paginate products
  useEffect(() => {
    let filtered = products;
    if (searchTerm) {
      filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          product.tags?.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }
    setFilteredProducts(filtered.slice(0, productPage * productsPerPage));
  }, [searchTerm, products, productPage]);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, "products"));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
      setFilteredProducts(productsData.slice(0, productsPerPage));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    }
  };

  const fetchOccasions = async () => {
    try {
      const q = query(collection(db, "occasions"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const occasionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOccasions(occasionsData);
    } catch (error) {
      console.error("Error fetching occasions:", error);
      toast.error("Failed to load occasions");
    }
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImageFile(file);
      const preview = URL.createObjectURL(file);
      setCoverImagePreview(preview);
      formik.setFieldValue("coverImage", file);
    }
  };

  const handleProductToggle = (product) => {
    const isSelected = selectedProducts.find((p) => p.id === product.id);
    let updatedProducts;

    if (isSelected) {
      updatedProducts = selectedProducts.filter((p) => p.id !== product.id);
    } else {
      updatedProducts = [...selectedProducts, product];
    }

    setSelectedProducts(updatedProducts);
    formik.setFieldValue(
      "products",
      updatedProducts.map((p) => p.id)
    );
  };

  const handleOccasionToggle = (occasionId) => {
    const currentOccasions = formik.values.occasions;
    const isSelected = currentOccasions.includes(occasionId);

    const updatedOccasions = isSelected
      ? currentOccasions.filter((o) => o !== occasionId)
      : [...currentOccasions, occasionId];

    formik.setFieldValue("occasions", updatedOccasions);
  };

  const handleStyleToggle = (style) => {
    const currentStyles = formik.values.styles;
    const isSelected = currentStyles.includes(style);

    const updatedStyles = isSelected
      ? currentStyles.filter((s) => s !== style)
      : [...currentStyles, style];

    formik.setFieldValue("styles", updatedStyles);
  };

  const uploadCoverImage = async (file) => {
    const imageRef = ref(storage, `collections/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const handleCreateCollection = async (values) => {
    setLoading(true);
    try {
      let coverImageUrl = "";
      if (coverImageFile) {
        coverImageUrl = await uploadImagesToCloudinary(coverImageFile);
      }

      const collectionData = {
        name: values.name,
        description: values.description,
        collectionType: values.collectionType,
        occasions:
          values.collectionType === COLLECTION_TYPES.OCCASION
            ? values.occasions
            : [],
        styles:
          values.collectionType === COLLECTION_TYPES.STYLE ? values.styles : [],
        products: values.products,
        isFeatured: values.isFeatured,
        isActive: values.isActive,
        coverImage: coverImageUrl,
        productCount: values.products.length,
        tags: values.tags
          ? values.tags.split(",").map((tag) => tag.trim())
          : [],
        discountPercentage: values.discountPercentage
          ? Number(values.discountPercentage)
          : null,
        startDate: values.startDate ? new Date(values.startDate) : null,
        endDate: values.endDate ? new Date(values.endDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 0,
        totalSales: 0,
        seoTitle: values.seoTitle,
        seoDescription: values.seoDescription,
        sortOrder: Number(values.sortOrder) || 0,
      };

      const docRef = await addDoc(
        collection(db, "collections"),
        collectionData
      );

      toast.success("Collection created successfully!");

      // Reset form and close modal
      formik.resetForm();
      setSelectedProducts([]);
      setCoverImageFile(null);
      setCoverImagePreview("");
      setSearchTerm("");
      setProductPage(1);
      setDrawerOpen(false);

      if (onCollectionAdded) {
        onCollectionAdded({ id: docRef.id, ...collectionData });
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create collection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setSelectedProducts([]);
    setCoverImageFile(null);
    setCoverImagePreview("");
    setSearchTerm("");
    setProductPage(1);
    setDrawerOpen(false);
  };

  const loadMoreProducts = () => {
    setProductPage((prev) => prev + 1);
  };

  return (
    <MasterDrawer
      title="Create New Collection"
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
            {loading ? "Creating..." : "Create Collection"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Collection Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter collection name"
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
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your collection..."
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
              <Label htmlFor="collectionType">Collection Type *</Label>
              <Select
                name="collectionType"
                value={formik.values.collectionType}
                onValueChange={(value) => {
                  formik.setFieldValue("collectionType", value);
                  formik.setFieldValue("occasions", []);
                  formik.setFieldValue("styles", []);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select collection type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COLLECTION_TYPES).map(([key, value]) => (
                    <SelectItem key={value} value={value}>
                      {key.charAt(0) + key.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.collectionType &&
                formik.errors.collectionType && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.collectionType}
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isFeatured"
                  checked={formik.values.isFeatured}
                  onCheckedChange={(checked) =>
                    formik.setFieldValue("isFeatured", checked)
                  }
                />
                <Label htmlFor="isFeatured" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Featured Collection
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formik.values.isActive}
                  onCheckedChange={(checked) =>
                    formik.setFieldValue("isActive", checked)
                  }
                />
                <Label htmlFor="isActive">Active Collection</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle>Cover Image *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="coverImage">Upload Cover Image</Label>
              <Input
                id="coverImage"
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="cursor-pointer"
              />
              {formik.touched.coverImage && formik.errors.coverImage && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.coverImage}
                </p>
              )}
            </div>

            {coverImagePreview && (
              <div className="relative w-full h-48">
                <img
                  src={coverImagePreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Occasions or Styles */}
        {formik.values.collectionType === COLLECTION_TYPES.OCCASION && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Occasions *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {occasions.map((occasion) => (
                  <div
                    key={occasion.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={occasion.id}
                      checked={formik.values.occasions.includes(occasion.id)}
                      onCheckedChange={() => handleOccasionToggle(occasion.id)}
                    />
                    <Label
                      htmlFor={occasion.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Calendar className="h-4 w-4" />
                      {occasion.name}
                    </Label>
                  </div>
                ))}
              </div>
              {formik.touched.occasions && formik.errors.occasions && (
                <p className="text-red-500 text-sm mt-2">
                  {formik.errors.occasions}
                </p>
              )}

              {formik.values.occasions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    Selected Occasions:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formik.values.occasions.map((occasionId) => {
                      const occasion = occasions.find(
                        (o) => o.id === occasionId
                      );
                      return occasion ? (
                        <Badge
                          key={occasionId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Calendar className="h-4 w-4" />
                          {occasion.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleOccasionToggle(occasionId)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {formik.values.collectionType === COLLECTION_TYPES.STYLE && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Styles *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {STYLE_TYPES.map((style) => (
                  <div key={style} className="flex items-center space-x-2">
                    <Checkbox
                      id={style}
                      checked={formik.values.styles.includes(style)}
                      onCheckedChange={() => handleStyleToggle(style)}
                    />
                    <Label
                      htmlFor={style}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Star className="h-4 w-4" />
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
              {formik.touched.styles && formik.errors.styles && (
                <p className="text-red-500 text-sm mt-2">
                  {formik.errors.styles}
                </p>
              )}

              {formik.values.styles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Selected Styles:</p>
                  <div className="flex flex-wrap gap-2">
                    {formik.values.styles.map((style) => (
                      <Badge
                        key={style}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Star className="h-4 w-4" />
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleStyleToggle(style)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Products *</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProducts.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Selected Products ({selectedProducts.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((product) => (
                    <Badge
                      key={product.id}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {product.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleProductToggle(product)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.find(
                  (p) => p.id === product.id
                );
                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors relative ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleProductToggle(product)}
                  >
                    <div className="flex gap-3">
                      <div className="flex items-center">
                        <Checkbox
                          checked={!!isSelected}
                          onChange={() => handleProductToggle(product)}
                        />
                      </div>

                      {product.images?.[0] && (
                        <img
                          src={product.images[0]?.url}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}

                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{product.name}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-medium text-sm">
                            ${product.price}
                          </span>
                          {product.orderType && (
                            <Badge variant="outline" className="text-xs">
                              {product.orderType.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                        {product.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default">Selected</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredProducts.length < products.length && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={loadMoreProducts}
                  disabled={loading}
                >
                  Load More Products
                </Button>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No products found</p>
              </div>
            )}

            {formik.touched.products && formik.errors.products && (
              <p className="text-red-500 text-sm">{formik.errors.products}</p>
            )}
          </CardContent>
        </Card>

        {/* Additional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.endDate && formik.errors.endDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.endDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountPercentage">
                  Collection Discount (%)
                </Label>
                <Input
                  id="discountPercentage"
                  name="discountPercentage"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formik.values.discountPercentage}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  placeholder="0"
                  value={formik.values.sortOrder}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="e.g., trending, bestseller, limited-edition..."
                value={formik.values.tags}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Settings */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="seoTitle">SEO Title</Label>
              <Input
                id="seoTitle"
                name="seoTitle"
                placeholder="SEO-friendly title for search engines"
                value={formik.values.seoTitle}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>
            <div>
              <Label htmlFor="seoDescription">SEO Description</Label>
              <Textarea
                id="seoDescription"
                name="seoDescription"
                placeholder="SEO-friendly description for search engines"
                value={formik.values.seoDescription}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </MasterDrawer>
  );
};

export default CollectionModal;
