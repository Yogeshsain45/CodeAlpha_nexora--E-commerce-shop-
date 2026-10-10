const router = require("express").Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { body, param, validationResult } = require("express-validator");
const validate = (req, res, next) => { const e = validationResult(req); if (!e.isEmpty()) return res.status(400).json({ message: e.array()[0].msg }); next(); };
async function getCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}
async function populated(cart) {
  await cart.populate("items.product");
  const items = cart.items.filter(i => i.product && i.product.active).map(i => ({
    product: { id: i.product.id, name: i.product.name, price: i.product.price, image: i.product.image, stock: i.product.stock, slug: i.product.slug },
    quantity: i.quantity, lineTotal: i.product.price * i.quantity
  }));
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const shipping = subtotal === 0 || subtotal >= Number(process.env.FREE_SHIPPING_THRESHOLD || 1499) ? 0 : Number(process.env.SHIPPING_FEE || 79);
  return { items, subtotal, shipping, total: subtotal + shipping };
}
router.use(requireAuth);
router.get("/", asyncHandler(async (req, res) => res.json(await populated(await getCart(req.user.id)))));
router.post("/items", body("productId").isMongoId().withMessage("Invalid product."), body("quantity").optional().isInt({ min: 1, max: 20 }).withMessage("Quantity must be between 1 and 20."), validate, asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.body.productId, active: true });
  if (!product) return res.status(404).json({ message: "Product not found." });
  const quantity = Number(req.body.quantity || 1);
  const cart = await getCart(req.user.id);
  const item = cart.items.find(i => String(i.product) === String(product._id));
  const nextQuantity = (item ? item.quantity : 0) + quantity;
  if (product.stock < nextQuantity) return res.status(400).json({ message: "Not enough stock available." });
  if (item) item.quantity = nextQuantity; else cart.items.push({ product: product._id, quantity });
  await cart.save();
  res.json(await populated(cart));
}));
router.patch("/items/:productId", param("productId").isMongoId().withMessage("Invalid product."), body("quantity").isInt({ min: 1, max: 20 }).withMessage("Quantity must be between 1 and 20."), validate, asyncHandler(async (req, res) => {
  const cart = await getCart(req.user.id);
  const item = cart.items.find(i => String(i.product) === req.params.productId);
  if (!item) return res.status(404).json({ message: "Cart item not found." });
  const product = await Product.findById(req.params.productId);
  if (!product || !product.active) return res.status(404).json({ message: "Product is unavailable." });
  if (Number(req.body.quantity) > product.stock) return res.status(400).json({ message: "Quantity exceeds available stock." });
  item.quantity = Number(req.body.quantity);
  await cart.save();
  res.json(await populated(cart));
}));
router.delete("/items/:productId", param("productId").isMongoId().withMessage("Invalid product."), validate, asyncHandler(async (req, res) => {
  const cart = await getCart(req.user.id);
  cart.items = cart.items.filter(i => String(i.product) !== req.params.productId);
  await cart.save();
  res.json(await populated(cart));
}));
module.exports = router;