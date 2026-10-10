const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
router.use(requireAuth, requireAdmin);
router.get("/dashboard", asyncHandler(async (req, res) => {
  const [products, orders, customers, sales, recentOrders, lowStock] = await Promise.all([
    Product.countDocuments({ active: true }), Order.countDocuments(), User.countDocuments({ role: "user" }),
    Order.aggregate([{ $match: { status: { $ne: "Cancelled" }, paymentMethod: "cod" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Order.find().sort({ createdAt: -1 }).limit(8).populate("user", "name email").lean(),
    Product.find({ active: true, stock: { $lte: 5 } }).sort({ stock: 1 }).limit(8).lean()
  ]);
  res.json({ stats: { products, orders, customers, sales: sales[0]?.total || 0 }, recentOrders, lowStock });
}));
router.get("/products", asyncHandler(async (req, res) => res.json({ products: await Product.find().sort({ createdAt: -1 }).lean() })));
router.post("/products", [
  body("name").trim().isLength({ min: 2, max: 140 }), body("description").trim().notEmpty(),
  body("price").isFloat({ min: 0 }), body("category").trim().notEmpty(), body("stock").isInt({ min: 0 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "Name, description, price, category and valid stock are required." });
  const slugBase = String(req.body.slug || req.body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${slugBase}-${Date.now().toString(36)}`;
  const product = await Product.create({
    name: req.body.name, slug, description: req.body.description, price: Number(req.body.price),
    compareAtPrice: req.body.compareAtPrice ? Number(req.body.compareAtPrice) : null,
    category: req.body.category, image: req.body.image || "", stock: Number(req.body.stock),
    featured: Boolean(req.body.featured), specifications: req.body.specifications || {}
  });
  res.status(201).json({ product });
}));
router.patch("/products/:id", asyncHandler(async (req, res) => {
  const allowed = ["name", "description", "price", "compareAtPrice", "category", "image", "stock", "featured", "active", "specifications"];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (updates.price !== undefined && (!Number.isFinite(Number(updates.price)) || Number(updates.price) < 0)) return res.status(400).json({ message: "Price must be zero or greater." });
  if (updates.stock !== undefined && (!Number.isInteger(Number(updates.stock)) || Number(updates.stock) < 0)) return res.status(400).json({ message: "Stock must be a non-negative integer." });
  const product = await Product.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json({ product });
}));
router.delete("/products/:id", asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json({ message: "Product archived." });
}));
router.get("/orders", asyncHandler(async (req, res) => res.json({ orders: await Order.find().sort({ createdAt: -1 }).populate("user", "name email").lean() })));
router.patch("/orders/:id/status", asyncHandler(async (req, res) => {
  const allowed = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (order.status === "Cancelled" && req.body.status !== "Cancelled") return res.status(400).json({ message: "Cancelled orders cannot be reopened here." });
  if (req.body.status === "Cancelled" && order.status !== "Cancelled") {
    const mongoose = require("mongoose"), session = await mongoose.startSession();
    try { await session.withTransaction(async () => {
      for (const item of order.items) if (item.product) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      order.status = "Cancelled"; await order.save({ session });
    }); } finally { await session.endSession(); }
  } else { order.status = req.body.status; await order.save(); }
  res.json({ order });
}));
router.get("/customers", asyncHandler(async (req, res) => res.json({ customers: await User.find({ role: "user" }).select("name email createdAt").sort({ createdAt: -1 }).limit(500).lean() })));
module.exports = router;