const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/singup", authController.singup);
router.post("/login", authController.login);
// router.get("/logout", userController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.route("/getAllUsers").get(userController.getAllUsers);

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/getUserById/:id',  userController.getUserById);

router.patch(
  "/updateMyPassword", userController.updatePassword);

router.delete("/deleteMe", userController.deleteMe);

router.get("/me", userController.getMe, userController.getOne);
router.patch(
  "/updateMe",
  userController.updateMe
);

router.patch(
  "/updateMyPhoto",
  userController.uploadUserPhoto,
  userController.UserProfilePhoto
);

module.exports = router;




