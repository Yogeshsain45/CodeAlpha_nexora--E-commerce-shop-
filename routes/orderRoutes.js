const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const mongoose = require("mongoose");
router.use(requireAuth);
router.post("/", [
  body("shippingAddress.fullName").trim().isLength({ min: 2, max: 100 }).withMessage("Enter the recipient's full name."),
  body("shippingAddress.phone").trim().isLength({ min: 7, max: 20 }).withMessage("Enter a valid phone number."),
  body("shippingAddress.line1").trim().isLength({ min: 4, max: 200 }).withMessage("Enter your street address."),
  body("shippingAddress.city").trim().notEmpty().withMessage("City is required."),
  body("shippingAddress.state").trim().notEmpty().withMessage("State is required."),
  body("shippingAddress.postalCode").trim().isLength({ min: 4, max: 12 }).withMessage("Enter a valid postal code.")
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  if (req.body.paymentMethod && req.body.paymentMethod !== "cod") return res.status(400).json({ message: "Online payments are not configured. Please choose Cash on Delivery." });
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart || !cart.items.length) return res.status(400).json({ message: "Your cart is empty." });
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const items = [];
      let subtotal = 0;
      for (const cartItem of cart.items) {
        const product = await Product.findOneAndUpdate(
          { _id: cartItem.product, active: true, stock: { $gte: cartItem.quantity } },
          { $inc: { stock: -cartItem.quantity } }, { new: true, session }
        );
        if (!product) throw Object.assign(new Error("One or more items are out of stock. Please update your cart."), { status: 409 });
        const lineTotal = product.price * cartItem.quantity;
        subtotal += lineTotal;
        items.push({ product: product._id, name: product.name, image: product.image, unitPrice: product.price, quantity: cartItem.quantity, lineTotal });
      }
      const shipping = subtotal >= Number(process.env.FREE_SHIPPING_THRESHOLD || 1499) ? 0 : Number(process.env.SHIPPING_FEE || 79);
      const [order] = await Order.create([{
        user: req.user._id, items, shippingAddress: req.body.shippingAddress,
        subtotal, shipping, discount: 0, total: subtotal + shipping,
        paymentMethod: "cod", paymentStatus: "pending", status: "Pending",
        notes: String(req.body.notes || "").slice(0, 500)
      }], { session });
      cart.items = [];
      await cart.save({ session });
      created = order;
    });
  } finally { await session.endSession(); }
  res.status(201).json({ order: created });
}));
router.get("/my", asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ orders });
}));
router.get("/:id", asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!order) return res.status(404).json({ message: "Order not found." });
  res.json({ order });
}));
router.patch("/:id/cancel", asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (!["Pending", "Confirmed"].includes(order.status)) return res.status(400).json({ message: "This order can no longer be cancelled online." });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      order.status = "Cancelled";
      for (const item of order.items) if (item.product) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      await order.save({ session });
    });
  } finally { await session.endSession(); }
  res.json({ order });
}));
module.exports = router;