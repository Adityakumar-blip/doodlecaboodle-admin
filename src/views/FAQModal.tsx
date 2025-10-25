/* eslint-disable @typescript-eslint/no-explicit-any */
import { MasterDrawer } from "@/components/MasterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const db = getFirestore();

const validationSchema = Yup.object({
  question: Yup.string()
    .min(5, "Question must be at least 5 characters")
    .required("Question is required"),
  answer: Yup.string()
    .min(10, "Answer must be at least 10 characters")
    .required("Answer is required"),
  status: Yup.string()
    .oneOf(["active", "inactive"], "Invalid status")
    .required("Status is required"),
});

const FAQModal = ({ drawerOpen, setDrawerOpen, onFAQAdded, editingFAQ }) => {
  const [loading, setLoading] = useState(false);

  const formik: any = useFormik({
    initialValues: {
      question: editingFAQ?.question || "",
      answer: editingFAQ?.answer || "",
      status: editingFAQ?.status || "active",
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleAddFAQ(values);
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (editingFAQ) {
      formik.setValues({
        question: editingFAQ.question,
        answer: editingFAQ.answer,
        status: editingFAQ.status,
      });
    }
  }, [editingFAQ]);

  const handleAddFAQ = async (values) => {
    setLoading(true);
    try {
      const faqData = {
        ...values,
        createdAt: editingFAQ ? editingFAQ.createdAt : new Date(),
        updatedAt: new Date(),
      };

      let docRef;
      if (editingFAQ) {
        docRef = doc(db, "faqs", editingFAQ.id);
        await updateDoc(docRef, faqData);
      } else {
        docRef = await addDoc(collection(db, "faqs"), faqData);
      }

      toast.success(
        editingFAQ ? "FAQ updated successfully!" : "FAQ added successfully!"
      );
      formik.resetForm();
      setDrawerOpen(false);

      if (onFAQAdded) {
        onFAQAdded({
          id: editingFAQ ? editingFAQ.id : docRef.id,
          ...faqData,
        });
      }
    } catch (error) {
      console.error("Error processing FAQ:", error);
      toast.error(editingFAQ ? "Failed to update FAQ." : "Failed to add FAQ.");
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
      title={editingFAQ ? "Edit FAQ" : "Add New FAQ"}
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
            {loading ? "Saving..." : editingFAQ ? "Update FAQ" : "Save FAQ"}
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
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                name="question"
                placeholder="Enter FAQ question"
                value={formik.values.question}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.question && formik.errors.question
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.question && formik.errors.question && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.question}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="answer">Answer *</Label>
              <Textarea
                id="answer"
                name="answer"
                placeholder="Provide the answer..."
                value={formik.values.answer}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={6}
                className={
                  formik.touched.answer && formik.errors.answer
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.answer && formik.errors.answer && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.answer}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                onValueChange={(value) => formik.setFieldValue("status", value)}
                value={formik.values.status}
              >
                <SelectTrigger
                  className={
                    formik.touched.status && formik.errors.status
                      ? "border-red-500"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {formik.touched.status && formik.errors.status && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.status}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default FAQModal;
