import axios from "axios";
import { Cloudinary } from "@cloudinary/url-gen";

// Initialize Cloudinary with your configuration
const cloudinaryConfig = {
  cloudName: "dwmrrgaxd", // Replace with your Cloudinary cloud name
  apiKey: "885114481731964", // Replace with your Cloudinary API key
  apiSecret: "gs8euHyH0SUF-CsMNC9rBYB6-wY", // Replace with your Cloudinary API secret
};

// Image compression utility function
const compressImage = (file, maxSizeInMB = 5, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions to maintain aspect ratio
      let { width, height } = img;
      const maxDimension = 1920; // Maximum width or height

      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          // Check if compressed size is under limit
          const sizeInMB = blob.size / (1024 * 1024);

          if (sizeInMB <= maxSizeInMB) {
            // Create a new File object with original name
            const compressedFile = new File([blob], file.name, {
              type: blob.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            // If still too large, compress further
            const newQuality = quality * 0.8;
            if (newQuality > 0.1) {
              compressImage(file, maxSizeInMB, newQuality).then(resolve);
            } else {
              // Fallback: use the compressed version even if slightly over limit
              const compressedFile = new File([blob], file.name, {
                type: blob.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          }
        },
        file.type.startsWith("image/png") ? "image/png" : "image/jpeg",
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// Updated upload function with compression
export const uploadImagesToCloudinary = async (imageFiles) => {
  try {
    // Normalize input: ensure it's always an array
    const filesArray = Array.isArray(imageFiles) ? imageFiles : [imageFiles];

    const uploadPromises = filesArray.map(async (file) => {
      let processedFile = file;

      // Check if file is an image and needs compression
      if (file.type.startsWith("image/") && file.size > 5 * 1024 * 1024) {
        console.log(
          `Compressing ${file.name} (${(file.size / (1024 * 1024)).toFixed(
            2
          )}MB)`
        );
        processedFile = await compressImage(file);
        console.log(
          `Compressed to ${(processedFile.size / (1024 * 1024)).toFixed(2)}MB`
        );
      }

      const formData = new FormData();
      formData.append("file", processedFile);
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
