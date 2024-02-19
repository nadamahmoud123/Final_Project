const User = require("../models/userModel");
const Post = require("../models/postModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const multer = require("multer");
const sharp = require("sharp");
const sendEmail = require("../utils/email");

const fs = require("fs");
const {
  cloudinaryUploadImage,
  cloudinaryRemoveImage,
} = require("../utils/cloudinary");

const DataURIParser = require("datauri/parser");
const duri = new DataURIParser();
const path = require("path");

//Define Upload Directory and
// Define the destination directory for storing uploaded files locally
const uploadDirectory = path.join(__dirname, "../public/images/users");

// a file is uploaded, Multer will store the file data on disk in the specified destination directory
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    // generates unique filenames for each uploaded file.
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// filter to test if the uploaded file is an image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload images only.", 400));
  }
};

// middleware for uploading photo
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single("photo");
exports.UserProfilePhoto = catchAsync(async (req, res, next) => {
  // 1) Validation
  if (!req.file) return next(new AppError("No photo provided", 400));

  // 2) Get the path to the uploaded image
  const imagePath = path.join(uploadDirectory, req.file.filename);

  // 3) Upload the image to Cloudinary
  const result = await cloudinaryUploadImage(imagePath);

  // 4) It retrieves the user document from the database
  const user = await User.findById(req.user.id);

  //5) Delete the old photo from Cloudinary
  if (user.photo && user.photo.public_id) {
    await cloudinaryRemoveImage(user.photo.public_id);
  }

  //6)  Update the user's photo data
  user.photo = {
    public_id: result.public_id,
    url: result.secure_url,
  };

  // 6) updates the user's photo data with the Cloudinary URL.
  user.photo = result.secure_url;
  user.markModified("photo"); // Mark the photo field as modified
  await user.save({ validateBeforeSave: false });

  // 7) Delete the local image file after it has been uploaded to Cloudinary
  fs.unlinkSync(imagePath);

  res.status(200).json({
    success: true,
    message: "Your photo updated successfully",
    data: {
      user,
    },
  });
});

//filter out unwanted fields from the input object and return a new object containing only the allowed fields.
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  if (req.body.email) {
    return next(new AppError("Email cannot be changed.", 400));
  }
  // 2) Filtered out unwanted fields names that are allowed to be updated
  const filteredBody = filterObj(req.body, "name", "phone");

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  //console.log("Updated User:", updatedUser);
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// retrieve the ID of the authenticated user from the req.user object and assign it to req.params.id
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getOne = catchAsync(async (req, res, next) => {
  const doc = await User.findById(req.params.id).populate({
    path: "posts",
    select: "-user",
  });

  if (!doc) return next(new AppError("No user found with that ID", 404));

  res.status(200).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  // Delete the old photo from Cloudinary
  if (userId.photo && userId.photo.public_id) {
    await cloudinaryRemoveImage(userId.photo.public_id);
  }
  //Remove users posts
  await Promise.all([
    User.findByIdAndDelete(userId),
    Post.deleteMany({ user: userId }),
  ]);

  // await User.findByIdAndDelete(req.user.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getUserById = catchAsync(async (req, res, next) => {
  // Get user from params
  const id = req.params.id;
  // Check if the user exists
  const user = await User.findById(id).populate({
    path: "posts",
    select: "-user",
  });
  if (!user) {
    return next(new AppError("No user found with that ID.", 404));
  }
  res.status(200).json({
    status: "succes",
    data: {
      user,
    },
  });
});

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find();
  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});
