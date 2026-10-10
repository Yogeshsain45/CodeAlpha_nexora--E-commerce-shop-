require("dotenv").config();
const connectDB = require("../config/db");
const Product = require("../models/Product");
const products = [
  ["Luma Wireless Headphones","electronics",2499,34,"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",true,"Rich sound, soft ear cushions and dependable wireless listening."],
  ["Pulse Smart Watch","electronics",3299,21,"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",true,"A sleek everyday smartwatch with activity tracking and notifications."],
  ["Arc Portable Speaker","electronics",1899,18,"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85",true,"Compact speaker with room-filling sound and a minimalist finish."],
  ["Studio Mechanical Keyboard","electronics",4599,12,"https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85",false,"Tactile typing, a sturdy frame and a clean desk-friendly profile."],
  ["Orbit Wireless Mouse","electronics",1299,40,"https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85",false,"Comfortable wireless control for work and everyday browsing."],
  ["Everyday Canvas Tote","fashion",799,60,"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",true,"A versatile carry-all made for busy days and weekend plans."],
  ["Classic Minimal Sneakers","fashion",2799,27,"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",true,"An easy-to-style sneaker with a lightweight everyday feel."],
  ["Essential Cotton Hoodie","fashion",1599,31,"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",false,"A relaxed layer made for comfort through every season."],
  ["Modern Crossbody Bag","fashion",1399,22,"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85",false,"Keep daily essentials close in a compact, modern silhouette."],
  ["Everyday Analog Watch","fashion",2199,16,"https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85",true,"A timeless dial and versatile strap for work or weekends."],
  ["Ceramic Table Lamp","home-living",1899,14,"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",true,"Warm ambient light for bedside tables and cozy reading corners."],
  ["Soft Knit Throw","home-living",1199,25,"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85",false,"Add a soft, inviting layer to your sofa or bedroom."],
  ["Stoneware Coffee Set","home-living",999,35,"https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85",false,"A considered set for slow mornings and afternoon coffee."],
  ["Minimal Wall Clock","home-living",1499,19,"https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=900&q=85",false,"A quiet statement piece with an uncluttered modern face."],
  ["Desk Organizer Set","home-living",699,50,"https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=85",false,"Bring order to your workspace with practical desk essentials."],
  ["Everyday Sunglasses","accessories",999,44,"https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85",true,"A versatile frame designed to finish off everyday outfits."],
  ["Slim Card Wallet","accessories",599,55,"https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85",false,"A compact wallet for the cards and essentials you actually use."],
  ["Travel Bottle","accessories",499,75,"https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85",false,"A reusable bottle for commutes, workouts and day trips."],
  ["Premium Phone Stand","accessories",449,38,"https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=900&q=85",false,"Keep your phone at a comfortable angle on your desk."],
  ["Weekend Duffel Bag","accessories",2499,13,"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",true,"A roomy travel companion for short trips and gym sessions."]
].map(([name, category, price, stock, image, featured, description]) => ({
  name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  category, price, stock, image, featured, description,
  compareAtPrice: price > 1000 ? Math.round(price * 1.2) : null,
  specifications: { "Care": "Use as directed", "Availability": stock > 0 ? "In stock" : "Out of stock" }
}));
(async () => {
  try {
    await connectDB();
    for (const p of products) await Product.updateOne({ slug: p.slug }, { $set: p }, { upsert: true, runValidators: true });
    console.log(`Seeded/updated ${products.length} products.`);
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();