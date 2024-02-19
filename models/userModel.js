const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: [true, "Please provide an email"],
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    photo: {
      publicId: {
        type: String,
        default: null,
      },
      url: {
        type: String,
        default: "default.jpg",
      },
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      // This only works on CREATE and SAVE!!!
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same!",
      },
    },
    phone: {
      type: String,
      required: [true, "Please provide your phone number"],
    },

    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// virtual populate
userSchema.virtual("posts", {
  ref: "Post",
  foreignField: "user",
  localField: "_id",
});

// use document middleware to encrypt the password
userSchema.pre("save", async function (next) {
  // only run this function if password was actully modified
  if (!this.isModified("password")) return next();

  // hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // no longer needed it, a have the real password hashed
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// instance method that is gonne be available on all documents
// password that the user enter and the password in the database
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//determine if the password has been changed after a specific timestamp.
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.pre("findOneAndUpdate", async function (next) {
  if (!this._update.photo) return next(); // Check if photo field is being updated
  try {
    const docToUpdate = await this.model.findOne(this.getQuery());
    if (docToUpdate.photo && docToUpdate.photo !== "default.jpg") {
      await cloudinaryRemoveImage(docToUpdate.photo);
    }
  } catch (err) {
    console.error("Error deleting old photo:", err);
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
