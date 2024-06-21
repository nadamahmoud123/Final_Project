const Post = require("../models/postModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("./userController");
const sharp = require("sharp");
const multer = require("multer");
const {
  cloudinaryUploadImage,
  cloudinaryRemoveImage,
} = require("../utils/cloudinary");
const fs = require("fs");
const DataURIParser = require("datauri/parser");
const duri = new DataURIParser();
const path = require("path");

const uploadDirectory = path.join(__dirname, "../public/images/posts");

const imagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    if (file) {
      cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
    } else {
      cb(null, false);
    }
  },
});

// Multer filter to test if the uploaded file is an images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload images only."), false);
  }
};

// multer middleware for upload images
const uploadImages = multer({
  storage: imagesStorage,
  fileFilter: multerFilter,
});
exports.uploadPostImages = uploadImages.fields([
  { name: "images", maxCount: 3 },
]);

exports.resizePostImages = catchAsync(async (req, res, next) => {
  // 1. Check if images were uploaded
  if (!req.files.images) {
    // If no images are provided, simply skip the image update process
    return next();
  }
  //2) Initialize array to store image data
  req.body.images = [];

  try {
    //3) Upload each image to Cloudinary and process asynchronously
    await Promise.all(
      req.files.images.map(async (file, i) => {
        // Upload image to Cloudinary
        const result = await cloudinaryUploadImage(file.path);

        //4) Construct image data object with URL and public ID
        const imageData = {
          url: result.secure_url,
          public_id: result.public_id,
        };

        //5) Store image data in array
        req.body.images.push(imageData);

        //6) Remove uploaded file from server
        fs.unlinkSync(file.path);
      })
    );

    // Move to next middleware
    next();
  } catch (error) {
    // Handle any errors
    return next(new AppError("Error resizing and uploading images", 500));
  }
});

exports.updatePostImages = catchAsync(async (req, res, next) => {
  // Check if files are provided
  if (!req.files.images) {
    // If no images are provided, simply skip the image update process
    return next();
  }

  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    //1) Delete old images from Cloudinary
    if (post.images && post.images.length > 0) {
      await Promise.all(
        post.images.map(async (image) => {
          await cloudinaryRemoveImage(image.public_id);
        })
      );
    }

    req.body.images = [];
    // 2) Upload updated images to cloudinary server
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const result = await cloudinaryUploadImage(file.path);

        //ensure that information about each uploaded image, such as its URL and public ID, is collected

        const imageData = {
          url: result.secure_url,
          public_id: result.public_id,
        };
        //and stored in an array for further processing or storage, such as updating the post document in the database.
        req.body.images.push(imageData);

        // Remove file from server once it has been saved in Cloudinary
        fs.unlinkSync(file.path);
      })
    );

    next();
  } catch (error) {
    return next(new AppError("Error resizing and uploading images", 500));
  }
});

exports.getLatestPosts = catchAsync(async (req, res, next) => {
  const limit = 10; // Number of posts to retrieve
  const sortQuery = { createdAt: -1 }; // Sort by createdAt field in descending order

  const posts = await Post.find().limit(limit).sort(sortQuery);

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});

exports.getAllPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find();

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const categories = Post.schema.path("category").enumValues;
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

exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new AppError("No Post found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      post,
    },
  });
});

exports.createPost = catchAsync(async (req, res, next) => {
  // Create a new post without populating the user field
  req.body.user = req.user.id;
  // Check if price is provided, set it to null if not
  if (!req.body.price) {
    req.body.price = null;
  }
  const newPost = await Post.create(req.body);

  // Populate the user field in the newly created post
  const populatedPost = await Post.findById(newPost._id).populate("user");
  //console.log("New Post ID:", newPost._id);
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
  // Check if price is provided, set it to null if not
  if (!req.body.price) {
    req.body.price = null;
  }

  // Check if the authenticated user owns the post
  if (req.user.id !== post.user.id) {
    return next(
      new AppError("You do not have permission to edit this post", 403)
    );
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

  // Delete old images from Cloudinary
  if (post.images && post.images.length > 0) {
    await Promise.all(
      post.images.map(async (image) => {
        await cloudinaryRemoveImage(image.public_id);
      })
    );
  }
  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  // Check if the authenticated user owns the post
  if (req.user.id !== post.user.id) {
    return next(
      new AppError("You do not have permission to delete this post", 403)
    );
  }

  // Update the post
  await Post.findByIdAndDelete(req.params.id);
  res.status(204).json({
    status: "success",
    data: null,
  });
});
exports.searchPostsByContent = catchAsync(async (req, res, next) => {
  const query = req.params.q; // Retrieve the search query from route parameters

  try {
    // Perform search using a regex pattern to match the query in the content field
    const posts = await Post.find({
      content: { $regex: query, $options: "i" },
    });

    res.status(200).json({
      status: "success",
      results: posts.length,
      data: {
        posts,
      },
    });
  } catch (error) {
    return next(new AppError("Error searching posts", 500));
  }
});

exports.getFreePosts = catchAsync(async (req, res, next) => {
  const freePosts = await Post.find({ price: null });

  res.status(200).json({
    status: "success",
    results: freePosts.length,
    data: {
      posts: freePosts,
    },
  });
});

exports.getPaidPosts = catchAsync(async (req, res, next) => {
  const paidPosts = await Post.find({ price: { $ne: null } });

  res.status(200).json({
    status: "success",
    results: paidPosts.length,
    data: {
      posts: paidPosts,
    },
  });
});
