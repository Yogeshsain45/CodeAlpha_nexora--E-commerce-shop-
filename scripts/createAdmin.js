require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
(async () => {
  try {
    await connectDB();
    const name = process.env.ADMIN_NAME;
    const email = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || "";
    if (!email || !password || password.length < 12 || password === "ChangeThisAdminPassword123!") {
      throw new Error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters in .env before creating the admin.");
    }
    const hash = await bcrypt.hash(password, 12);
    await User.updateOne({ email }, { $set: { name: name || "Store Admin", password: hash, role: "admin" }, $setOnInsert: { email } }, { upsert: true });
    console.log(`Admin account ready: ${email}`);
    process.exit(0);
  } catch (e) { console.error(e.message); process.exit(1); }
})();