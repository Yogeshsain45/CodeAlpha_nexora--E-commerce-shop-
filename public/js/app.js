const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
const state = { products: [], featured: [], page: 1, pages: 1, user: null, cart: null, activeCategory: "All", query: "", sort: "popular", maxPrice: "", drawerView: "cart" };
const imageFallback = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=75";

async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}
function toast(message, type = "success") {
  const el = document.createElement("div"); el.className = `toast ${type === "error" ? "error" : ""}`; el.textContent = message;
  $("#toastRegion").append(el); setTimeout(() => el.remove(), 3400);
}
function safe(text = "") { return String(text).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function productCard(p) {
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  return `<article class="product-card">
    <div class="product-image-wrap"><a href="#product/${encodeURIComponent(p.slug || p._id)}" aria-label="View ${safe(p.name)}"><img class="product-image" src="${safe(p.image || imageFallback)}" alt="${safe(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${imageFallback}'"></a>
      ${discount ? `<span class="product-tag">${discount}% off</span>` : p.featured ? `<span class="product-tag">Good pick</span>` : ""}
      <button class="wishlist-btn" data-wish="${p._id}" aria-label="Add ${safe(p.name)} to wishlist" title="Wishlist">♡</button>
      <button class="quick-add" data-add="${p._id}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Sold out" : "＋ Add to bag"}</button>
    </div>
    <div class="product-meta"><div><a class="product-name" href="#product/${encodeURIComponent(p.slug || p._id)}">${safe(p.name)}</a><div class="product-category">${safe((p.category || "").replace("-", " "))}</div><div class="product-rating">${p.reviewCount ? `★ ${Number(p.rating || 0).toFixed(1)} · ${p.reviewCount} reviews` : "Thoughtfully selected"}</div></div>
    <div class="product-price">${money(p.price)}${discount ? `<span class="old-price">${money(p.compareAtPrice)}</span>` : ""}</div></div>
  </article>`;
}
function renderProducts(products, target) {
  const el = $(target);
  el.innerHTML = products.length ? products.map(productCard).join("") : `<div class="empty-products">No products found. Try another search or clear your filters.</div>`;
}
async function loadCategories() {
  try {
    const { categories } = await api("/api/categories");
    $("#categoryFilter").innerHTML = categories.map(c => `<option value="${safe(c)}">${c === "All" ? "All categories" : safe(c.replace("-", " ").replace(/\b\w/g, x => x.toUpperCase()))}</option>`).join("");
  } catch { /* shop remains usable with default category */ }
}
async function loadFeatured() {
  try {
    const { products } = await api("/api/products/featured");
    state.featured = products;
    renderProducts(products.slice(0, 4), "#featuredGrid");
  } catch { $("#featuredGrid").innerHTML = `<div class="empty-products">Connect MongoDB and run the seed command to load featured products.</div>`; }
}
async function loadProducts(reset = true) {
  if (reset) state.page = 1;
  const params = new URLSearchParams({ page: state.page, limit: 12, sort: state.sort });
  if (state.activeCategory !== "All") params.set("category", state.activeCategory);
  if (state.query) params.set("q", state.query);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  try {
    const data = await api(`/api/products?${params}`);
    state.pages = data.pagination.pages;
    state.products = reset ? data.products : state.products.concat(data.products);
    renderProducts(state.products, "#productGrid");
    $("#resultsCount").textContent = `${data.pagination.total} ${data.pagination.total === 1 ? "item" : "items"} to make your day`;
    $("#loadMore").hidden = state.page >= state.pages;
  } catch (e) {
    $("#productGrid").innerHTML = `<div class="empty-products">${safe(e.message)}<br><small>Make sure MongoDB is running and products are seeded.</small></div>`;
    $("#resultsCount").textContent = "Products unavailable";
  }
}
async function refreshUser() {
  try { state.user = (await api("/api/auth/me")).user; } catch { state.user = null; }
  updateAccountLink();
}
function updateAccountLink() {
  const link = $(".account-link");
  if (link) { link.setAttribute("aria-label", state.user ? `Account: ${state.user.name}` : "Account"); link.textContent = state.user ? "☺" : "♙"; }
}
async function refreshCartCount() {
  if (!state.user) { $("#cartCount").textContent = "0"; state.cart = null; return; }
  try { state.cart = await api("/api/cart"); $("#cartCount").textContent = state.cart.items.reduce((n, i) => n + i.quantity, 0); }
  catch { $("#cartCount").textContent = "0"; }
}
function openDrawer(view = "cart") {
  state.drawerView = view; $("#appOverlay").hidden = false; document.body.style.overflow = "hidden"; renderDrawer();
  $("#closeDrawer").focus();
}
function closeDrawer() { $("#appOverlay").hidden = true; document.body.style.overflow = ""; }
function emptyState(icon, title, body, action = "Continue shopping") {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${body}</p><button class="btn btn-dark" data-close-drawer>${action} ↗</button></div>`;
}
async function renderDrawer() {
  const body = $("#drawerBody");
  const titles = { cart: "Your bag", login: "Welcome back", register: "Make yourself at home", account: "Your account", checkout: "Checkout", orders: "Your orders", wishlist: "Your wishlist", product: "Product details", admin: "Store dashboard" };
  $("#drawerTitle").textContent = titles[state.drawerView] || "NEXORA";
  try {
    if (state.drawerView === "cart") return await renderCart(body);
    if (["login", "register"].includes(state.drawerView)) return renderAuthForm(body, state.drawerView);
    if (state.drawerView === "account") return renderAccount(body);
    if (state.drawerView === "checkout") return renderCheckout(body);
    if (state.drawerView === "orders") return renderOrders(body);
    if (state.drawerView === "wishlist") return renderWishlist(body);
    if (state.drawerView === "product") return renderProductDetails(body, state.productId);
    if (state.drawerView === "admin") return renderAdmin(body);
  } catch (e) { body.innerHTML = `<div class="empty-state"><h3>Couldn't load this just yet</h3><p>${safe(e.message)}</p><button class="btn btn-outline" data-close-drawer>Close</button></div>`; }
}
async function renderCart(body) {
  if (!state.user) { body.innerHTML = `${emptyState("♙", "Your bag is waiting.", "Log in to add items and keep your cart synced across visits.", "Sign in")}<p class="form-switch">New here? <button data-view="register">Create an account</button></p>`; return; }
  const cart = await api("/api/cart"); state.cart = cart; $("#cartCount").textContent = cart.items.reduce((n, i) => n + i.quantity, 0);
  if (!cart.items.length) { body.innerHTML = emptyState("⌑", "Nothing in your bag. Yet.", "Your next everyday favourite is out there. Go find it.", "Explore the collection"); return; }
  body.innerHTML = `<div>${cart.items.map(i => `<div class="cart-row"><img src="${safe(i.product.image || imageFallback)}" alt="${safe(i.product.name)}" onerror="this.src='${imageFallback}'"><div><h3>${safe(i.product.name)}</h3><p>${money(i.product.price)}</p><div class="quantity-control"><button data-qty="${i.product.id}" data-next="${i.quantity - 1}" aria-label="Decrease quantity" ${i.quantity <= 1 ? "disabled" : ""}>−</button><span>${i.quantity}</span><button data-qty="${i.product.id}" data-next="${i.quantity + 1}" aria-label="Increase quantity" ${i.quantity >= i.product.stock || i.quantity >= 20 ? "disabled" : ""}>+</button></div><button class="remove-item" data-remove="${i.product.id}">Remove</button></div><strong>${money(i.lineTotal)}</strong></div>`).join("")}</div>
  <div class="cart-summary"><div class="summary-line"><span>Subtotal</span><span>${money(cart.subtotal)}</span></div><div class="summary-line"><span>Shipping</span><span>${cart.shipping ? money(cart.shipping) : "Free"}</span></div>${cart.subtotal < 1499 ? `<p class="product-category">You're ${money(1499 - cart.subtotal)} away from free shipping.</p>` : ""}<div class="summary-line summary-total"><span>Total</span><span>${money(cart.total)}</span></div><button class="btn btn-dark" data-view="checkout">Continue to checkout <span>↗</span></button><button class="btn btn-outline" data-close-drawer>Keep exploring</button></div>`;
}
function renderAuthForm(body, mode) {
  const register = mode === "register";
  body.innerHTML = `<p class="detail-description">${register ? "Create an account for a smoother checkout and a place to keep your favourite finds." : "Sign in to pick up right where you left off."}</p>
  <form id="authForm" class="drawer-form">${register ? `<label>Full name<input name="name" required minlength="2" maxlength="80" autocomplete="name" placeholder="Your name"></label>` : ""}
  <label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
  <label>Password<input name="password" type="password" required minlength="${register ? 8 : 1}" autocomplete="${register ? "new-password" : "current-password"}" placeholder="${register ? "At least 8 characters" : "Your password"}"></label>
  ${register ? `<label>Confirm password<input name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Type it again"></label>` : ""}
  <button class="btn btn-dark" type="submit">${register ? "Create my account" : "Sign in"} <span>↗</span></button><div id="authError" role="alert"></div></form>
  <p class="form-switch">${register ? "Already have an account?" : "New to NEXORA?"} <button data-view="${register ? "login" : "register"}">${register ? "Sign in" : "Create an account"}</button></p>`;
  $("#authForm").addEventListener("submit", async e => {
    e.preventDefault(); const form = new FormData(e.currentTarget), payload = Object.fromEntries(form.entries());
    if (register && payload.password !== payload.confirmPassword) { $("#authError").textContent = "Passwords don't match."; return; }
    const button = $("button[type=submit]", e.currentTarget); button.disabled = true; button.textContent = "One moment…";
    try {
      const data = await api(`/api/auth/${register ? "register" : "login"}`, { method: "POST", body: JSON.stringify(payload) });
      state.user = data.user; updateAccountLink(); await refreshCartCount(); toast(register ? "Welcome to NEXORA!" : `Welcome back, ${state.user.name.split(" ")[0]}.`); openDrawer("account");
    } catch (err) { $("#authError").textContent = err.message; button.disabled = false; button.textContent = register ? "Create my account ↗" : "Sign in ↗"; }
  });
}
function renderAccount(body) {
  if (!state.user) { renderAuthForm(body, "login"); return; }
  body.innerHTML = `<p class="detail-description">Good to see you, ${safe(state.user.name)}. Your little corner of NEXORA.</p><div class="drawer-form"><button class="btn btn-outline" data-view="orders">View my orders ↗</button><button class="btn btn-outline" data-view="wishlist">My wishlist ♡</button>${state.user.role === "admin" ? `<button class="btn btn-outline" data-view="admin">Open store dashboard ↗</button>` : ""}<button class="btn btn-outline" data-profile>Update profile</button><button class="btn btn-dark" data-logout>Sign out ↗</button></div><div id="profileArea"></div>`;
}
async function renderCheckout(body) {
  if (!state.user) { body.innerHTML = `<p class="detail-description">Sign in or create an account before checkout.</p><button class="btn btn-dark" data-view="login">Sign in to continue ↗</button><p class="form-switch">New here? <button data-view="register">Create an account</button></p>`; return; }
  const cart = await api("/api/cart");
  if (!cart.items.length) { body.innerHTML = emptyState("⌑", "Your bag is empty", "Add something lovely before checking out."); return; }
  const address = state.user.address || {};
  body.innerHTML = `<p class="detail-description">Almost yours. Confirm where it should go.</p><form id="checkoutForm" class="drawer-form">
  <label>Full name<input name="fullName" required value="${safe(address.fullName || state.user.name)}" autocomplete="name"></label>
  <label>Phone number<input name="phone" required minlength="7" maxlength="20" value="${safe(address.phone || state.user.phone || "")}" autocomplete="tel"></label>
  <label>Address line<input name="line1" required minlength="4" value="${safe(address.line1 || "")}" autocomplete="street-address"></label>
  <label>Apartment, suite (optional)<input name="line2" value="${safe(address.line2 || "")}"></label>
  <label>City<input name="city" required value="${safe(address.city || "")}" autocomplete="address-level2"></label>
  <label>State<input name="state" required value="${safe(address.state || "")}" autocomplete="address-level1"></label>
  <label>PIN / postal code<input name="postalCode" required minlength="4" maxlength="12" value="${safe(address.postalCode || "")}" autocomplete="postal-code"></label>
  <label>Country<input name="country" required value="${safe(address.country || "India")}" autocomplete="country-name"></label>
  <label>Order notes (optional)<textarea name="notes" maxlength="500" placeholder="Anything we should know?"></textarea></label>
  <div class="order-card"><div class="summary-line"><span>${cart.items.reduce((n,i)=>n+i.quantity,0)} items · Subtotal</span><span>${money(cart.subtotal)}</span></div><div class="summary-line"><span>Shipping</span><span>${cart.shipping ? money(cart.shipping) : "Free"}</span></div><div class="summary-line summary-total"><span>Total due on delivery</span><span>${money(cart.total)}</span></div><p>Payment: Cash on Delivery. Online payment is not configured.</p></div>
  <button class="btn btn-dark" type="submit">Place order · ${money(cart.total)} <span>↗</span></button><div id="checkoutError" role="alert"></div></form>`;
  $("#checkoutForm").addEventListener("submit", async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget), f = Object.fromEntries(fd.entries());
    const payload = { shippingAddress: { fullName: f.fullName, phone: f.phone, line1: f.line1, line2: f.line2, city: f.city, state: f.state, postalCode: f.postalCode, country: f.country }, notes: f.notes, paymentMethod: "cod" };
    const btn = $("button[type=submit]", e.currentTarget); btn.disabled = true; btn.textContent = "Placing your order…";
    try {
      const { order } = await api("/api/orders", { method: "POST", body: JSON.stringify(payload) });
      await refreshCartCount(); toast("Your order is placed. Thank you!");
      body.innerHTML = `<div class="empty-state"><div class="empty-icon">✳</div><h3>It's a good day.</h3><p>Your order <strong>${safe(order.orderNumber)}</strong> is confirmed for processing. Pay ${money(order.total)} on delivery.</p><button class="btn btn-dark" data-view="orders">Track my order ↗</button><button class="btn btn-outline" data-close-drawer>Keep exploring</button></div>`;
    } catch (err) { $("#checkoutError").textContent = err.message; btn.disabled = false; btn.textContent = `Place order · ${money(cart.total)} ↗`; }
  });
}
async function renderOrders(body) {
  if (!state.user) { renderAuthForm(body, "login"); return; }
  const { orders } = await api("/api/orders/my");
  if (!orders.length) { body.innerHTML = emptyState("↗", "Your story starts here.", "When you place an order, you'll find all the details here."); return; }
  body.innerHTML = orders.map(o => `<article class="order-card"><div class="order-card-head"><span>${safe(o.orderNumber)}</span><span class="status-pill">${safe(o.status)}</span></div><p>${new Date(o.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} · ${o.items.length} line items<br>${o.items.map(i => `${safe(i.name)} × ${i.quantity}`).join("<br>")}<br><strong>${money(o.total)}</strong> · ${o.paymentMethod === "cod" ? "Cash on Delivery" : safe(o.paymentMethod)}</p>${["Pending","Confirmed"].includes(o.status) ? `<button class="btn btn-outline" data-cancel-order="${o._id}">Cancel order</button>` : ""}</article>`).join("");
}
async function renderWishlist(body) {
  if (!state.user) { renderAuthForm(body, "login"); return; }
  const { products } = await api("/api/wishlist");
  body.innerHTML = products.length ? `<div class="product-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">${products.map(productCard).join("")}</div>` : emptyState("♡", "Save the good ones.", "Tap the heart on any product to keep it here.");
}
async function renderProductDetails(body, id) {
  const { product, related } = await api(`/api/products/${encodeURIComponent(id)}`);
  body.innerHTML = `<img class="detail-image" src="${safe(product.image || imageFallback)}" alt="${safe(product.name)}" onerror="this.src='${imageFallback}'"><p class="product-category">${safe(product.category.replace("-", " "))}</p><h3 class="drawer-section-title">${safe(product.name)}</h3><div class="detail-price">${money(product.price)} ${product.compareAtPrice ? `<span class="old-price">${money(product.compareAtPrice)}</span>` : ""}</div><p class="detail-description">${safe(product.description)}</p><p class="product-category">${product.stock > 0 ? `${product.stock} available` : "Currently sold out"}</p><div class="detail-actions"><button class="btn btn-dark" data-add="${product._id}" ${product.stock < 1 ? "disabled" : ""}>Add to bag ↗</button><button class="btn btn-outline" data-wish="${product._id}">♡</button></div>${related.length ? `<h3 class="drawer-section-title">You might also like</h3><div class="product-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">${related.map(productCard).join("")}</div>` : ""}`;
}
async function renderAdmin(body) {
  if (!state.user || state.user.role !== "admin") { body.innerHTML = emptyState("⌑", "Admin access only", "Sign in with your store administrator account to continue."); return; }
  const data = await api("/api/admin/dashboard");
  body.innerHTML = `<p class="detail-description">A quick look at how your store is doing.</p><div class="admin-stats"><div class="admin-stat"><small>Total sales (COD orders)</small><strong>${money(data.stats.sales)}</strong></div><div class="admin-stat"><small>Orders</small><strong>${data.stats.orders}</strong></div><div class="admin-stat"><small>Products</small><strong>${data.stats.products}</strong></div><div class="admin-stat"><small>Customers</small><strong>${data.stats.customers}</strong></div></div><h3 class="drawer-section-title">Recent orders</h3>${data.recentOrders.length ? `<table class="admin-table"><thead><tr><th>Order</th><th>Total</th><th>Status</th></tr></thead><tbody>${data.recentOrders.map(o => `<tr><td>${safe(o.orderNumber)}</td><td>${money(o.total)}</td><td><select data-admin-status="${o._id}">${["Pending","Confirmed","Processing","Shipped","Delivered","Cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>` : "<p>No orders yet.</p>"}<h3 class="drawer-section-title">Low stock</h3>${data.lowStock.length ? data.lowStock.map(p=>`<p class="summary-line"><span>${safe(p.name)}</span><strong>${p.stock} left</strong></p>`).join("") : "<p class='detail-description'>All stocked up.</p>"}<h3 class="drawer-section-title">Add a product</h3><form id="adminProductForm" class="drawer-form"><label>Product name<input name="name" required minlength="2"></label><label>Description<textarea name="description" required></textarea></label><label>Price (₹)<input name="price" type="number" min="0" step="1" required></label><label>Category<input name="category" required placeholder="electronics"></label><label>Stock<input name="stock" type="number" min="0" step="1" required></label><label>Image URL<input name="image" type="url" placeholder="https://..."></label><label><span><input name="featured" type="checkbox" style="width:auto"> Featured product</span></label><button class="btn btn-dark">Add product ↗</button></form>`;
}
document.addEventListener("click", async e => {
  const target = e.target.closest("button,a"); if (!target) return;
  if (target.id === "menuToggle") { $("#mainNav").classList.toggle("open"); return; }
  if (target.id === "searchToggle") { $("#searchInput").focus(); $("#shop").scrollIntoView({ behavior: "smooth" }); return; }
  if (target.matches('a[href="#cart"]')) { e.preventDefault(); openDrawer("cart"); return; }
  if (target.matches('a[href="#account"]')) { e.preventDefault(); openDrawer("account"); return; }
  if (target.matches('a[href="#orders"]')) { e.preventDefault(); openDrawer("orders"); return; }
  if (target.matches('a[href="#wishlist"]')) { e.preventDefault(); openDrawer("wishlist"); return; }
  if (target.id === "closeDrawer" || target.hasAttribute("data-close-drawer")) { closeDrawer(); if (target.hasAttribute("data-close-drawer") && state.drawerView === "cart") $("#shop").scrollIntoView({ behavior: "smooth" }); return; }
  if (target.hasAttribute("data-view")) { e.preventDefault(); openDrawer(target.dataset.view); return; }
  if (target.hasAttribute("data-add")) {
    if (!state.user) { toast("Sign in to add items to your bag."); openDrawer("login"); return; }
    try { state.cart = await api("/api/cart/items", { method:"POST", body:JSON.stringify({productId:target.dataset.add,quantity:1}) }); $("#cartCount").textContent = state.cart.items.reduce((n,i)=>n+i.quantity,0); toast("Added to your bag."); if (state.drawerView === "cart") renderDrawer(); }
    catch (err) { toast(err.message,"error"); } return;
  }
  if (target.hasAttribute("data-qty")) {
    try { await api(`/api/cart/items/${target.dataset.qty}`, { method:"PATCH", body:JSON.stringify({quantity:Number(target.dataset.next)}) }); await refreshCartCount(); renderDrawer(); }
    catch (err) { toast(err.message,"error"); } return;
  }
  if (target.hasAttribute("data-remove")) {
    try { await api(`/api/cart/items/${target.dataset.remove}`, { method:"DELETE" }); await refreshCartCount(); renderDrawer(); toast("Removed from your bag."); }
    catch (err) { toast(err.message,"error"); } return;
  }
  if (target.hasAttribute("data-wish")) {
    if (!state.user) { toast("Sign in to save your favourites."); openDrawer("login"); return; }
    try {
      const id = target.dataset.wish;
      if (target.classList.contains("active")) { await api(`/api/wishlist/${id}`,{method:"DELETE"}); target.classList.remove("active"); target.textContent="♡"; toast("Removed from wishlist."); }
      else { await api(`/api/wishlist/${id}`,{method:"POST"}); target.classList.add("active"); target.textContent="♥"; toast("Saved to your wishlist."); }
    } catch (err) { toast(err.message,"error"); } return;
  }
  if (target.hasAttribute("data-cancel-order")) {
    if (!confirm("Cancel this order?")) return;
    try { await api(`/api/orders/${target.dataset.cancelOrder}/cancel`,{method:"PATCH"}); toast("Order cancelled."); renderDrawer(); } catch (err) { toast(err.message,"error"); } return;
  }
  if (target.hasAttribute("data-logout")) {
    try { await api("/api/auth/logout",{method:"POST"}); state.user=null; await refreshCartCount(); updateAccountLink(); toast("You've been signed out."); openDrawer("login"); } catch (err) { toast(err.message,"error"); } return;
  }
  if (target.hasAttribute("data-profile")) {
    $("#profileArea").innerHTML = `<form id="profileForm" class="drawer-form"><label>Name<input name="name" value="${safe(state.user.name)}" required minlength="2"></label><label>Phone<input name="phone" value="${safe(state.user.phone || "")}"></label><button class="btn btn-dark">Save profile ↗</button></form>`;
    $("#profileForm").addEventListener("submit", async ev => { ev.preventDefault(); const f=Object.fromEntries(new FormData(ev.currentTarget)); try { const d=await api("/api/users/me",{method:"PATCH",body:JSON.stringify(f)}); state.user={...state.user,...d.user}; updateAccountLink(); toast("Profile updated."); renderDrawer(); } catch(err){toast(err.message,"error");} }); return;
  }
  if (target.hasAttribute("data-admin-status")) {
    try { await api(`/api/admin/orders/${target.dataset.adminStatus}/status`,{method:"PATCH",body:JSON.stringify({status:target.value})}); toast("Order status updated."); } catch(err){toast(err.message,"error"); renderDrawer();} return;
  }
  const productLink = target.closest('a[href^="#product/"]');
  if (productLink) { e.preventDefault(); state.productId=decodeURIComponent(productLink.getAttribute("href").slice(9)); openDrawer("product"); return; }
  const category = target.closest("[data-category-link]");
  if (category) { e.preventDefault(); state.activeCategory=category.dataset.categoryLink; $("#categoryFilter").value=state.activeCategory; loadProducts(); $("#shop").scrollIntoView({behavior:"smooth"}); $("#mainNav").classList.remove("open"); return; }
});
$("#appOverlay").addEventListener("click", e => { if (e.target === $("#appOverlay")) closeDrawer(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#appOverlay").hidden) closeDrawer(); });
$("#searchInput").addEventListener("input", e => { state.query=e.target.value.trim(); $("#clearSearch").hidden=!state.query; clearTimeout(window.__searchDelay); window.__searchDelay=setTimeout(()=>loadProducts(),280); });
$("#clearSearch").addEventListener("click", () => { $("#searchInput").value=""; state.query=""; $("#clearSearch").hidden=true; loadProducts(); });
$("#categoryFilter").addEventListener("change", e => { state.activeCategory=e.target.value; loadProducts(); });
$("#sortFilter").addEventListener("change", e => { state.sort=e.target.value; loadProducts(); });
$("#priceFilter").addEventListener("change", e => { state.maxPrice=e.target.value; loadProducts(); });
$("#loadMore").addEventListener("click", async () => { if (state.page < state.pages) { state.page++; $("#loadMore").textContent="Loading…"; await loadProducts(false); $("#loadMore").textContent="Load more products ↓"; } });
$("#newsletterForm").addEventListener("submit", e => { e.preventDefault(); const email=$("#newsletterEmail").value.trim(); if(!email) return; $("#newsletterMessage").textContent="Thanks for your interest! Newsletter delivery needs an email provider to be configured."; toast("Thanks for signing up."); e.target.reset(); });
$("#year").textContent = new Date().getFullYear();
async function init() {
  await refreshUser(); await Promise.all([loadCategories(), loadFeatured(), loadProducts()]); await refreshCartCount();
  if (location.hash === "#cart") openDrawer("cart");
  if (location.hash === "#account") openDrawer("account");
  if (location.hash === "#orders") openDrawer("orders");
  if (location.hash === "#wishlist") openDrawer("wishlist");
}
init();