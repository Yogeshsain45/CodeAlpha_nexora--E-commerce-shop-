const User = require("../models/User");
exports.requireAuth = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: "Please log in to continue." });
    const user = await User.findById(req.session.userId);
    if (!user) { req.session.destroy(() => {}); return res.status(401).json({ message: "Please log in again." }); }
    req.user = user;
    next();
  } catch (err) { next(err); }
};
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
  next();
};