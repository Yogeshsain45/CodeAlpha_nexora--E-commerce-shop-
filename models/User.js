const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  phone: { type: String, trim: true, default: "" },
  address: {
    fullName: String, phone: String, line1: String, line2: String,
    city: String, state: String, postalCode: String, country: { type: String, default: "India" }
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }]
}, { timestamps: true });
module.exports = mongoose.model("User", userSchema);