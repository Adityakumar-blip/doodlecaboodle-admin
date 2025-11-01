/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getFirestore,
} from "firebase/firestore";
import { toast } from "sonner";
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const db = getFirestore();

interface Category {
  id: string;
  name: string;
}

const validationSchema = Yup.object({
  categoryId: Yup.string().required("Category is required"),
  title: Yup.string().min(3, "Title must be at least 3 characters").required(),
  type: Yup.string()
    .oneOf(["checkbox", "input", "slider", "dropdown", "radio"])
    .required("Filter type is required"),
  options: Yup.array().when("type", {
    is: (val: string) => ["checkbox", "dropdown", "radio"].includes(val),
    then: (schema) =>
      schema.min(1, "At least one option is required for this filter type"),
    otherwise: (schema) => schema,
  }),
});

type FilterModalProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onFilterAdded: (data: any) => void;
  onFilterUpdated: (data: any) => void;
  selectedFilter: any | null;
};

const FilterModal: React.FC<FilterModalProps> = ({
  drawerOpen,
  setDrawerOpen,
  onFilterAdded,
  onFilterUpdated,
  selectedFilter,
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const formik: any = useFormik({
    initialValues: {
      categoryId: "",
      title: "",
      type: "checkbox",
      options: [] as string[],
      tempOption: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleSubmit(values);
    },
  });

  const fetchCategories = async () => {
    try {
      const qs = await getDocs(collection(db, "productCategories"));
      setCategories(
        qs.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[]
      );
    } catch (err) {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    if (drawerOpen) fetchCategories();
  }, [drawerOpen]);

  useEffect(() => {
    if (selectedFilter) {
      formik.setValues({
        categoryId: selectedFilter.categoryId || "",
        title: selectedFilter.title || "",
        type: selectedFilter.type || "checkbox",
        options: selectedFilter.options || [],
        tempOption: "",
      });
    } else {
      formik.resetForm();
    }
  }, [selectedFilter]);

  const addOption = () => {
    if (!formik.values.tempOption.trim()) return;

    formik.setFieldValue("options", [
      ...formik.values.options,
      formik.values.tempOption.trim(),
    ]);

    formik.setFieldValue("tempOption", "");
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const data = {
        categoryId: values.categoryId,
        title: values.title,
        type: values.type,
        options: values.options,
        updatedAt: new Date(),
        ...(selectedFilter ? {} : { createdAt: new Date() }),
      };

      if (selectedFilter) {
        await updateDoc(doc(db, "filters", selectedFilter.id), data);
        toast.success("Filter updated!");
        onFilterUpdated({ id: selectedFilter.id, ...data });
      } else {
        const ref = await addDoc(collection(db, "filters"), data);
        toast.success("Filter created!");
        onFilterAdded({ id: ref.id, ...data });
      }

      formik.resetForm();
      setDrawerOpen(false);
    } catch (err) {
      toast.error("Failed to save filter");
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
      title={selectedFilter ? "Edit Filter" : "Add New Filter"}
      isOpen={drawerOpen}
      onOpenChange={setDrawerOpen}
      size="full"
      position="right"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            disabled={loading || !formik.isValid}
            onClick={formik.handleSubmit}
          >
            {loading
              ? "Saving..."
              : selectedFilter
              ? "Update Filter"
              : "Save Filter"}
          </Button>
        </div>
      }
    >
      <form className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
        {/* Category */}
        <Card>
          <CardHeader>
            <CardTitle>Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Category *</Label>
            <Select
              value={formik.values.categoryId}
              onValueChange={(val) => formik.setFieldValue("categoryId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem value={cat.id} key={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formik.touched.categoryId && formik.errors.categoryId && (
              <p className="text-red-500 text-sm mt-1">
                {formik.errors.categoryId}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter Title */}
            <div>
              <Label>Title *</Label>
              <Input
                name="title"
                placeholder="Filter title"
                value={formik.values.title}
                onChange={formik.handleChange}
              />
              {formik.touched.title && formik.errors.title && (
                <p className="text-red-500 text-sm">{formik.errors.title}</p>
              )}
            </div>

            {/* Filter Type */}
            <div>
              <Label>Filter Type *</Label>
              <Select
                value={formik.values.type}
                onValueChange={(val) => formik.setFieldValue("type", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkbox">
                    Checkbox (multi-select)
                  </SelectItem>
                  <SelectItem value="dropdown">
                    Dropdown (single-select)
                  </SelectItem>
                  <SelectItem value="radio">Radio (single-select)</SelectItem>
                  <SelectItem value="input">Input Field</SelectItem>
                  <SelectItem value="slider">Slider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Options */}
            {["checkbox", "dropdown", "radio"].includes(formik.values.type) && (
              <>
                <Label>Add Options *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Option name"
                    value={formik.values.tempOption}
                    onChange={(e) =>
                      formik.setFieldValue("tempOption", e.target.value)
                    }
                  />
                  <Button type="button" onClick={addOption}>
                    Add
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {formik.values.options.map((opt: string, i: number) => (
                    <div
                      key={i}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md flex items-center gap-1 text-sm"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() =>
                          formik.setFieldValue(
                            "options",
                            formik.values.options.filter(
                              (_: string, idx: number) => idx !== i
                            )
                          )
                        }
                        className="text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {formik.touched.options && formik.errors.options && (
                  <p className="text-red-500 text-sm">
                    {formik.errors.options}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default FilterModal;
