const router = require("express").Router();
const { body, validationResult } = require("express-validator");
router.post("/", body("name").trim().isLength({ min: 2, max: 80 }), body("email").isEmail(), body("message").trim().isLength({ min: 10, max: 2000 }), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "Please provide a valid name, email and message." });
  // A real email provider can be connected via SMTP. Do not claim delivery without it.
  res.status(202).json({ message: "Thanks for reaching out. Your form was validated; email delivery is not configured on this demo." });
});
module.exports = router;