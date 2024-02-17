const express = require("express");
const postController = require("../controllers/postController");
const authController = require("../controllers/authController");

const router = express.Router();

router.route("/last-10-posts").get(postController.getLatestPosts);

router
  .route("/")
  .get(postController.getAllPosts)
  .post(
    authController.protect,
    postController.uploadPostImages,
    postController.resizePostImages,
    postController.createPost
  );

router.route("/getAllCategories").get(postController.getAllCategories);

router
  .route("/:id")
  .get(authController.protect, postController.getPost)
  .patch(
    authController.protect,
    postController.uploadPostImages,
    //postController.resizePostImages,
    postController.updatePostImages,
    postController.updatePost
  )
  .delete(authController.protect, postController.deletePost);

router.get(
  "/category/:category",
  authController.protect,
  postController.getPostsByCategory
);

module.exports = router;
