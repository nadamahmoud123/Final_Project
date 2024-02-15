const cloudinary = require('cloudinary');


// cloudinary upload image
const cloudinaryUploadImage =async(fileToUpload) => {
    try{
    const data = await cloudinary.uploader.upload(fileToUpload, { 
       resource_type: 'auto' });
       return data;
    }catch(err){
        return err;
    }   
};

// cloudinary remove image
const cloudinaryRemoveImage =async(imageUrl) => {
    try{
    const result = await cloudinary.uploader.destroy(imageUrl);
       return result;
    }catch(err){
        return err;
    }   
};
module.exports={
   cloudinaryUploadImage,
   cloudinaryRemoveImage
};







   