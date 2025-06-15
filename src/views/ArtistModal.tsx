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
import { X, Plus } from "lucide-react";
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { collection, addDoc, getFirestore } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
import { toast } from "sonner";
import { uploadImagesToCloudinary } from "@/services/CloudinaryUpload";

const db = getFirestore();
const storage = getStorage();

const validationSchema = Yup.object({
  name: Yup.string()
    .min(2, "Artist name must be at least 2 characters")
    .required("Artist name is required"),
  bio: Yup.string()
    .min(10, "Bio must be at least 10 characters")
    .required("Bio is required"),
  email: Yup.string().email("Invalid email format").nullable(),
  phone: Yup.string()
    .matches(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .nullable(),
  profileImage: Yup.mixed()
    .test(
      "file-size",
      "Profile image must be less than 10MB",
      (file) => !file || (file as File).size <= 10 * 1024 * 1024
    )
    .test(
      "file-type",
      "Only JPEG, PNG, or GIF images are allowed",
      (file) =>
        !file ||
        ["image/jpeg", "image/png", "image/gif"].includes((file as File).type)
    )
    .nullable(),
  socialLinks: Yup.array()
    .of(
      Yup.string()
        .url("Invalid URL format")
        .required("Social link cannot be empty")
    )
    .nullable(),
  status: Yup.string()
    .oneOf(["active", "inactive"], "Invalid status")
    .required("Status is required"),
});

const ArtistModal = ({ drawerOpen, setDrawerOpen, onArtistAdded }) => {
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [newSocialLink, setNewSocialLink] = useState("");
  const [loading, setLoading] = useState(false);

  const formik: any = useFormik({
    initialValues: {
      name: "",
      bio: "",
      email: "",
      phone: "",
      profileImage: null,
      socialLinks: [],
      status: "active",
    },
    validationSchema,
    onSubmit: async (values) => {
      await handleAddArtist(values);
    },
  });

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
      formik.setFieldValue("profileImage", file);
    }
  };

  const addSocialLink = () => {
    if (
      newSocialLink.trim() &&
      !formik.values.socialLinks.includes(newSocialLink.trim())
    ) {
      formik.setFieldValue("socialLinks", [
        ...formik.values.socialLinks,
        newSocialLink.trim(),
      ]);
      setNewSocialLink("");
    }
  };

  const removeSocialLink = (index) => {
    const updatedLinks = formik.values.socialLinks.filter(
      (_, i) => i !== index
    );
    formik.setFieldValue("socialLinks", updatedLinks);
  };

  const uploadProfileImage = async (file) => {
    if (!file) return null;
    try {
      // Use Cloudinary for consistency with ProductModal images
      const [imageUrl] = await uploadImagesToCloudinary([file]);
      return imageUrl;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw new Error("Failed to upload profile image");
    }
  };

  const handleAddArtist = async (values) => {
    setLoading(true);
    try {
      let profileImageUrl = null;
      if (profileImageFile) {
        profileImageUrl = await uploadProfileImage(profileImageFile);
      }

      const artistData = {
        ...values,
        profileImage: profileImageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Remove profileImage file from data (store URL instead)
      delete artistData.profileImage;

      const docRef = await addDoc(collection(db, "artists"), artistData);

      toast.success("Artist added successfully!");

      formik.resetForm();
      setProfileImageFile(null);
      setProfileImagePreview(null);
      setNewSocialLink("");
      setDrawerOpen(false);

      if (onArtistAdded) {
        onArtistAdded({ id: docRef.id, ...artistData });
      }
    } catch (error) {
      console.error("Error adding artist:", error);
      toast.error("Failed to add artist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    formik.resetForm();
    setProfileImageFile(null);
    setProfileImagePreview(null);
    setNewSocialLink("");
    setDrawerOpen(false);
  };

  return (
    <MasterDrawer
      title="Add New Artist"
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
            {loading ? "Saving..." : "Save Artist"}
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
              <Label htmlFor="name">Artist Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter artist name"
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
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Describe the artist..."
                value={formik.values.bio}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={4}
                className={
                  formik.touched.bio && formik.errors.bio
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.bio && formik.errors.bio && (
                <p className="text-red-500 text-sm mt-1">{formik.errors.bio}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email address"
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Enter phone number (e.g., +1234567890)"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.phone && formik.errors.phone
                    ? "border-red-500"
                    : ""
                }
              />
              {formik.touched.phone && formik.errors.phone && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Image */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="profileImage">Upload Profile Image</Label>
              <Input
                id="profileImage"
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleProfileImageChange}
                className="cursor-pointer"
              />
              {formik.touched.profileImage && formik.errors.profileImage && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.profileImage}
                </p>
              )}
            </div>

            {profileImagePreview && (
              <div className="relative w-32 h-32">
                <img
                  src={profileImagePreview}
                  alt="Profile Preview"
                  className="w-full h-full object-cover rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Media Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., https://instagram.com/artist"
                value={newSocialLink}
                onChange={(e) => setNewSocialLink(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addSocialLink())
                }
              />
              <Button type="button" onClick={addSocialLink} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formik.values.socialLinks.map((link, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {link}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeSocialLink(index)}
                  />
                </Badge>
              ))}
            </div>
            {formik.touched.socialLinks && formik.errors.socialLinks && (
              <p className="text-red-500 text-sm">
                {formik.errors.socialLinks}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status *</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formik.values.status}
              onValueChange={(value) => formik.setFieldValue("status", value)}
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
          </CardContent>
        </Card>
      </form>
    </MasterDrawer>
  );
};

export default ArtistModal;
