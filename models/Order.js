const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: String, image: String, unitPrice: Number, quantity: Number, lineTotal: Number
  }],
  shippingAddress: {
    fullName: String, phone: String, line1: String, line2: String,
    city: String, state: String, postalCode: String, country: String
  },
  subtotal: { type: Number, required: true },
  shipping: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cod"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
  status: { type: String, enum: ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"], default: "Pending" },
  notes: { type: String, maxlength: 500, default: "" }
}, { timestamps: true });
orderSchema.pre("validate", function(next) {
  if (!this.orderNumber) this.orderNumber = `NX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  next();
});
module.exports = mongoose.model("Order", orderSchema);