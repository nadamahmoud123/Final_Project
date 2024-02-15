const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, "Provide a content of post !"],
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  location: {
    type: String,
    required: [true, "location must be provided"],
  },
  category: {
      type: String,
      enum: ['أخري', 'أدوات مدرسيه', 'ألعاب', 'كتب', 'ديكور وأثاث', 'أحذية', 'أجهزة إلكترونية', 'هواتف محمولة', 'ملابس'],
      required: true
  }

});

postSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo phone",
  })
  next();
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;