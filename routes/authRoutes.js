const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const validate = (req, res, next) => { const e = validationResult(req); if (!e.isEmpty()) return res.status(400).json({ message: e.array()[0].msg, errors: e.array() }); next(); };

router.post("/register",
  body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2–80 characters."),
  body("email").trim().isEmail().withMessage("Enter a valid email."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  validate, asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email: normalizedEmail, password: await bcrypt.hash(password, 12) });
    req.session.userId = user.id;
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);
router.post("/login", body("email").isEmail().withMessage("Enter a valid email."), body("password").notEmpty().withMessage("Password is required."), validate, asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email).toLowerCase().trim() }).select("+password");
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ message: "Email or password is incorrect." });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ message: "Could not start your session." });
    req.session.userId = user.id;
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
}));
router.post("/logout", (req, res) => req.session.destroy(err => {
  res.clearCookie("nexora.sid", { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true" });
  if (err) return res.status(500).json({ message: "Could not log out." });
  res.json({ message: "Logged out successfully." });
}));
router.get("/me", asyncHandler(async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await User.findById(req.session.userId).select("name email role phone address");
  res.json({ user });
}));
router.post("/forgot-password", (req, res) => res.status(501).json({ message: "Password reset email is not configured. Contact the store administrator." }));
router.post("/reset-password", (req, res) => res.status(501).json({ message: "Password reset is unavailable until secure email token delivery is configured." }));
module.exports = router;