const router = require("express").Router();
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");
router.get("/", asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category", { active: true });
  res.json({ categories: ["All", ...categories.sort()] });
}));
module.exports = router;