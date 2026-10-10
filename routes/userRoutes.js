const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const User = require("../models/User");
router.use(requireAuth);
router.get("/me", (req, res) => res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone, address: req.user.address } }));
router.patch("/me", body("name").optional().trim().isLength({ min: 2, max: 80 }), body("phone").optional().trim().isLength({ max: 20 }), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "Please check your profile details." });
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.address && typeof req.body.address === "object") {
    const allowed = ["fullName", "phone", "line1", "line2", "city", "state", "postalCode", "country"];
    updates.address = Object.fromEntries(Object.entries(req.body.address).filter(([k, v]) => allowed.includes(k) && typeof v === "string").map(([k,v]) => [k, v.slice(0, 200)]));
  }
  const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true }).select("name email phone address");
  res.json({ user });
}));
router.patch("/me/password", body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 8 }), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "New password must be at least 8 characters." });
  const user = await User.findById(req.user.id).select("+password");
  if (!(await bcrypt.compare(req.body.currentPassword, user.password))) return res.status(400).json({ message: "Current password is incorrect." });
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ message: "Password updated successfully." });
}));
module.exports = router;