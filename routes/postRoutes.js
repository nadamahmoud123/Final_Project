/*const express = require("express");
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
router.get("/search/:q", postController.searchPostsByContent);

// New routes for free posts and posts with a price
router.get("/free-posts", postController.getFreePosts);
router.get("/paid-posts", postController.getPaidPosts);

module.exports = router;
*/

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

// New routes for free posts and posts with a price
router.get("/free-posts", postController.getFreePosts);
router.get("/paid-posts", postController.getPaidPosts);

router.get(
  "/category/:category",
  authController.protect,
  postController.getPostsByCategory
);
router.get("/search/:q", postController.searchPostsByContent);

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

module.exports = router;
