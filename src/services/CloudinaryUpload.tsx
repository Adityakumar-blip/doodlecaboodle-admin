import axios from "axios";
import { Cloudinary } from "@cloudinary/url-gen";

// Initialize Cloudinary with your configuration
const cloudinaryConfig = {
  cloudName: "dwmrrgaxd", // Replace with your Cloudinary cloud name
  apiKey: "885114481731964", // Replace with your Cloudinary API key
  apiSecret: "gs8euHyH0SUF-CsMNC9rBYB6-wY", // Replace with your Cloudinary API secret
};

export const uploadImagesToCloudinary = async (imageFiles) => {
  try {
    // Normalize input: ensure it's always an array
    const filesArray = Array.isArray(imageFiles) ? imageFiles : [imageFiles];

    const uploadPromises = filesArray.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ecommerce"); // Replace with your preset
      formData.append("cloud_name", cloudinaryConfig.cloudName);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        formData
      );

      return response.data.secure_url;
    });

    const imageUrls = await Promise.all(uploadPromises);

    // Return a single URL if one image was uploaded, else return array
    return imageUrls.length === 1 ? imageUrls[0] : imageUrls;
  } catch (error) {
    console.error("Error uploading images to Cloudinary:", error);
    throw new Error("Failed to upload images to Cloudinary");
  }
};
