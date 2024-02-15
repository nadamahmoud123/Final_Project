const Post = require("../models/postModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {    cloudinaryUploadImage,
  cloudinaryRemoveImage } = require('../utils/cloudinary');

const DataURIParser = require('datauri/parser');
const duri = new DataURIParser();


exports.getLatestPosts = catchAsync(async (req, res, next) => {
  const limit = 10; // Number of posts to retrieve
  const sortQuery = { createdAt: -1 }; // Sort by createdAt field in descending order

    const posts = await Post.find().limit(limit).sort(sortQuery);

    res.status(200).json({
      status: "success",
      results: posts.length,
      data: {
        posts
      }
    });

});

exports.getAllPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find();

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts
    },
  });
});

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const categories = Post.schema.path("category").enumValues;

  console.log(categories);
  res.status(200).json({
    status: "success",
    data: {
      categories,
    },
  });
});

exports.getPostsByCategory = catchAsync(async (req, res, next) => {
  const category = req.params.category;

  // Check if the category is valid (exists in the enum)
  const validCategories = Post.schema.path("category").enumValues;

  if (!validCategories.includes(category)) {
    return next(new AppError("Invalid category", 400));
  }

  // Query the database for posts with the specified category
  const posts = await Post.find({ category });

  // If no posts are found, you might want to handle this accordingly
  if (!posts || posts.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "No posts found for the specified category",
      data: null,
    });
  }

  // If posts are found, send them in the response
  res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});



// Get single post by ID
exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      post,
 
    },
  });
});

const multerStorage = multer.memoryStorage();

// filter to test if the uploaded file is an image
const multerFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image')){
    cb(null, true);
  }else{
    cb(new AppError("Not an image! Please upload images only.", 400));
  }
};

// midlleware for upload photo 
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadPostImages = upload.fields([
  { name:'images',maxCount: 3}
 
 ]);

 exports.resizePostImages = catchAsync(async (req, res, next) => {
  if (!req.files.images) return next(new AppError('No files found with given name', 400));

  // 1) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      // Upload image to Cloudinary
      const newImagePath = duri.format(path.extname(file.originalname).toString(), file.buffer);
      const result = await cloudinaryUploadImage(newImagePath.content);
      req.body.images.push(result.secure_url);
    })
  );

  next();
});



exports.createPost = catchAsync(async (req, res, next) => {
  // Create a new post without populating the user field
  req.body.user = req.user.id;
  const newPost = await Post.create(req.body);

  // Populate the user field in the newly created post
  const populatedPost = await Post.findById(newPost._id).populate("user");
  // console.log("New Post ID:", newPost._id);
  // console.log("Populated User:", populatedPost.user);
  res.status(201).json({
    status: "success",
    data: {
      post: populatedPost,
    },
  });
});


exports.updatePost = catchAsync(async (req, res, next) => {
 
    // Check if the post exists
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new AppError("No post found with that ID", 404));
    }
    // Check if the authenticated user owns the post
    if (req.user.id !== post.user.id) {
      return next(new AppError('You do not have permission to edit this post', 403));
    }
    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    res.status(200).json({
      status: "success",
      data: {
        post: updatedPost,
      },
    });

});

exports.deletePost = catchAsync(async (req, res, next) => {
    // Check if the post exists
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new AppError("No post found with that ID", 404));
    }
    // Check if the authenticated user owns the post
    if (req.user.id !== post.user.id) {
      return next(new AppError('You do not have permission to delete this post', 403));
    }
    // Delete the post
    await Post.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: "success",
      post: null,
    });
});
