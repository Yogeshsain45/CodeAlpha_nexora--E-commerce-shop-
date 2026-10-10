const router = require("express").Router();
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");
router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit || "12", 10)));
  const filter = { active: true };
  if (req.query.category && req.query.category !== "All") filter.category = req.query.category;
  if (req.query.inStock === "true") filter.stock = { $gt: 0 };
  if (req.query.minPrice || req.query.maxPrice) filter.price = {};
  if (req.query.minPrice) filter.price.$gte = Math.max(0, Number(req.query.minPrice) || 0);
  if (req.query.maxPrice) filter.price.$lte = Math.max(0, Number(req.query.maxPrice) || 0);
  if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 100) };
  const sortMap = { newest: { createdAt: -1 }, priceAsc: { price: 1 }, priceDesc: { price: -1 }, popular: { featured: -1, reviewCount: -1 } };
  const sort = sortMap[req.query.sort] || { featured: -1, createdAt: -1 };
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter)
  ]);
  res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
router.get("/featured", asyncHandler(async (req, res) => {
  const products = await Product.find({ active: true, featured: true }).sort({ createdAt: -1 }).limit(8).lean();
  res.json({ products });
}));
router.get("/:id", asyncHandler(async (req, res) => {
  const mongoose = require("mongoose");
  const query = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id, active: true } : { slug: req.params.id, active: true };
  const product = await Product.findOne(query).lean();
  if (!product) return res.status(404).json({ message: "Product not found." });
  const related = await Product.find({ active: true, category: product.category, _id: { $ne: product._id } }).limit(4).lean();
  res.json({ product, related });
}));
module.exports = router;