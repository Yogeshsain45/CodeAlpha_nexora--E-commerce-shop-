const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const User = require("../models/User");
const Product = require("../models/Product");
router.use(requireAuth);
router.get("/", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate({ path: "wishlist", match: { active: true } });
  res.json({ products: user.wishlist });
}));
router.post("/:productId", asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, active: true });
  if (!product) return res.status(404).json({ message: "Product not found." });
  await User.updateOne({ _id: req.user.id }, { $addToSet: { wishlist: product._id } });
  res.json({ message: "Added to wishlist." });
}));
router.delete("/:productId", asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $pull: { wishlist: req.params.productId } });
  res.json({ message: "Removed from wishlist." });
}));
module.exports = router;