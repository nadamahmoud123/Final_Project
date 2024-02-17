const cloudinary = require("cloudinary");

// cloudinary upload image
const cloudinaryUploadImage = async (fileToUpload) => {
  try {
    const data = await cloudinary.uploader.upload(fileToUpload, {
      resource_type: "auto",
    });
    return data;
  } catch (err) {
    return err;
  }
};

// cloudinary remove image
const cloudinaryRemoveImage = async (imageUrl) => {
  try {
    console.log("Deleting image:", imageUrl);
    const result = await cloudinary.uploader.destroy(imageUrl);
    console.log("Deletion result:", result);
    return result;
  } catch (err) {
    console.error("Error deleting image:", err);
    return err;
  }
};

module.exports = {
  cloudinaryUploadImage,
  cloudinaryRemoveImage,
};
