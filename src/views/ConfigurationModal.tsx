/* eslint-disable @typescript-eslint/no-explicit-any */
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getFirestore,
} from "firebase/firestore";

import { toast } from "sonner";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";

const db = getFirestore();

const validationSchema = Yup.object({
  quote: Yup.string().min(5).required("Quote is required"),
  author: Yup.string().min(2).required("Author is required"),
  heroBanner: Yup.string().required("Hero banner image is required"),
  announcementMessages: Yup.array().of(Yup.string()).optional(),
});

const ConfigurationModal = ({
  drawerOpen,
  setDrawerOpen,
  editingConfig,
  onConfigSaved,
}) => {
  const [loading, setLoading] = useState(false);

  const [heroBannerPreview, setHeroBannerPreview] = useState("");
  const [heroBannerFile, setHeroBannerFile] = useState<File | null>(null);

  const [announcementMessages, setAnnouncementMessages] = useState<string[]>([""]);

  useEffect(() => {
    if (editingConfig?.announcementMessages) {
      setAnnouncementMessages(editingConfig.announcementMessages);
    } else {
      setAnnouncementMessages([""]);
    }
  }, [editingConfig]);

  const handleMessageChange = (index: number, val: string) => {
    const updated = [...announcementMessages];
    updated[index] = val;
    setAnnouncementMessages(updated);
    formik.setFieldValue("announcementMessages", updated);
  };

  const addMessageField = () => {
    const updated = [...announcementMessages, ""];
    setAnnouncementMessages(updated);
    formik.setFieldValue("announcementMessages", updated);
  };

  const removeMessageField = (index: number) => {
    const updated = announcementMessages.filter((_, i) => i !== index);
    const final = updated.length > 0 ? updated : [""];
    setAnnouncementMessages(final);
    formik.setFieldValue("announcementMessages", final);
  };

  const formik: any = useFormik({
    initialValues: {
      quote: editingConfig?.quote || "",
      author: editingConfig?.author || "",
      heroBanner: editingConfig?.heroBanner || "",
      announcementMessages: editingConfig?.announcementMessages || [""],
    },
    validationSchema,
    onSubmit: async (values) => handleSave(values),
    enableReinitialize: true,
  });

  useEffect(() => {
    if (editingConfig?.heroBanner) {
      setHeroBannerPreview(editingConfig.heroBanner);
    }
  }, [editingConfig]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setHeroBannerFile(file);

    setHeroBannerPreview(previewUrl);
    formik.setFieldValue("heroBanner", previewUrl);
  };

  const removeImage = () => {
    setHeroBannerFile(null);
    setHeroBannerPreview("");
    formik.setFieldValue("heroBanner", "");
  };

  const handleSave = async (values) => {
    setLoading(true);

    try {
      let heroBannerUrl = editingConfig?.heroBanner || "";

      if (heroBannerFile) {
        const uploadResult = await uploadImagesToCloudinary([heroBannerFile]);
        heroBannerUrl = uploadResult;
      }

      const filteredMessages = (values.announcementMessages || []).filter(
        (msg: string) => msg.trim() !== ""
      );

      const configData = {
        quote: values.quote,
        author: values.author,
        heroBanner: heroBannerUrl,
        announcementMessages: filteredMessages,
        createdAt: editingConfig ? editingConfig.createdAt : new Date(),
        updatedAt: new Date(),
      };

      let docRef;

      if (editingConfig) {
        docRef = doc(db, "configuration", editingConfig.id);
        await updateDoc(docRef, configData);
      } else {
        docRef = await addDoc(collection(db, "configuration"), configData);
      }

      toast.success(
        editingConfig ? "Configuration updated" : "Configuration added"
      );

      formik.resetForm();
      setDrawerOpen(false);

      onConfigSaved({
        id: editingConfig ? editingConfig.id : docRef.id,
        ...configData,
      });

      setHeroBannerFile(null);
      setHeroBannerPreview("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MasterDrawer
      title={editingConfig ? "Edit Configuration" : "Add Configuration"}
      isOpen={drawerOpen}
      onOpenChange={setDrawerOpen}
      size="md"
      position="right"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDrawerOpen(false)}>
            Cancel
          </Button>
          <Button onClick={formik.handleSubmit} disabled={!formik.isValid}>
            {loading
              ? "Saving..."
              : editingConfig
              ? "Update Configuration"
              : "Save Configuration"}
          </Button>
        </div>
      }
    >
      <form className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
        {/* Quote */}
        <Card>
          <CardHeader>
            <CardTitle>Quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Quote *</Label>
              <Input
                name="quote"
                placeholder="Enter quote"
                value={formik.values.quote}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.quote && formik.errors.quote
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.quote && formik.errors.quote && (
                <p className="text-red-500 text-sm">{formik.errors.quote}</p>
              )}
            </div>

            {/* Author */}
            <div>
              <Label>Author *</Label>
              <Input
                name="author"
                placeholder="Enter author name"
                value={formik.values.author}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.author && formik.errors.author
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.author && formik.errors.author && (
                <p className="text-red-500 text-sm">{formik.errors.author}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Announcement Bar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Announcement Bar</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMessageField}
              className="h-8 text-xs font-semibold"
            >
              + Add Message
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcementMessages.map((message, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Announcement Message #${index + 1}`}
                  value={message}
                  onChange={(e) => handleMessageChange(index, e.target.value)}
                />
                {announcementMessages.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0 flex-shrink-0"
                    onClick={() => removeMessageField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              These messages will scroll sequentially at the top of the storefront. Leave all empty to hide the announcement bar.
            </p>
          </CardContent>
        </Card>

        {/* Hero Banner Image */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Banner Image *</CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="file" accept="image/*" onChange={handleImageChange} />

            {formik.touched.heroBanner && formik.errors.heroBanner && (
              <p className="text-red-500 text-sm">{formik.errors.heroBanner}</p>
            )}

            {heroBannerPreview && (
              <div className="relative mt-3 w-40">
                <img
                  src={heroBannerPreview}
                  className="w-full h-32 object-cover rounded border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 bg-gray-800 bg-opacity-50"
                  onClick={removeImage}
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

export default ConfigurationModal;
