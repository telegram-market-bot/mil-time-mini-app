const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxUbwEuAUkMXCCjOXxx1mjcoHcKdQxridfkC3t8NSWELXSvSLOdQI021QovdapkmYcs/exec";
let currentLang = "ua";
let PRODUCTS = [];
let filteredProducts = [];
let cart = [];
let galleryPhotos = [];
let currentPhotoIndex = 0;

const translations = {
  ua: { catalog: "Каталог товарів", cart: "Кошик", checkout: "Оформити", desc: "Опис", apply: "Застосувати", search: "Пошук", min: "Мін", max: "Макс" },
  en: { catalog: "Catalog", cart: "Cart", checkout: "Checkout", desc: "Description", apply: "Apply", search: "Search", min: "Min", max: "Max" },
  ru: { catalog: "Каталог товаров", cart: "Корзина", checkout: "Оформить", desc: "Описание", apply: "Применить", search: "Поиск", min: "Мин", max: "Макс" }
};

// === Helpers ===
function getField(obj, base) {
  return obj[`${base}_${currentLang}`] || obj[`${base}_ua`] || obj[base] || "";
}
function fixPhotoURL(url) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) return `https://drive.google.com/uc?export=view&id=${idMatch[0]}`;
  }
  return url.trim();
}

// === Load Products ===
async function loadProducts() {
  try {
    const res = await fetch(SHEET_API_URL);
    const data = await res.json();
    PRODUCTS = Array.isArray(data) ? data : data.products || [];
    filteredProducts = PRODUCTS;
    renderFilters();
    renderProducts();
  } catch (err) {
    console.error("Помилка завантаження:", err);
  }
}

// === Render Filters ===
function renderFilters() {
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const cats = uniq(PRODUCTS.map(p => getField(p, "category")));
  const seas = uniq(PRODUCTS.map(p => getField(p, "season")));
  const cols = uniq(PRODUCTS.map(p => getField(p, "colors")));
  const sizs = uniq(PRODUCTS.map(p => getField(p, "sizes")));

  renderChips("categoryPanel", cats);
  renderChips("seasons", seas);
  renderChips("colors", cols);
  renderChips("sizes", sizs);
}

function renderChips(id, arr) {
  const cont = document.getElementById(id);
  cont.innerHTML = "";
  arr.forEach(v => {
    const btn = document.createElement("button");
    btn.textContent = v;
    btn.className = "chip";
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
    });
    cont.appendChild(btn);
  });
}

// === Apply Filters ===
function applyFilters() {
  const catSel = [...document.querySelectorAll("#categoryPanel .chip.active")].map(b => b.textContent);
  const seaSel = [...document.querySelectorAll("#seasons .chip.active")].map(b => b.textContent);
  const colSel = [...document.querySelectorAll("#colors .chip.active")].map(b => b.textContent);
  const sizSel = [...document.querySelectorAll("#sizes .chip.active")].map(b => b.textContent);
  const min = parseFloat(document.getElementById("priceMin").value) || 0;
  const max = parseFloat(document.getElementById("priceMax").value) || Infinity;
  const search = document.getElementById("searchInput").value.toLowerCase();

  filteredProducts = PRODUCTS.filter(p => {
    const name = getField(p, "name").toLowerCase();
    const desc = getField(p, "desc").toLowerCase();
    const price = parseFloat(p.price_uah || 0);
    return (
      (catSel.length ? catSel.includes(getField(p, "category")) : true) &&
      (seaSel.length ? seaSel.includes(getField(p, "season")) : true) &&
      (colSel.length ? colSel.includes(getField(p, "colors")) : true) &&
      (sizSel.length ? sizSel.includes(getField(p, "sizes")) : true) &&
      price >= min && price <= max &&
      (!search || name.includes(search) || desc.includes(search))
    );
  });
  renderProducts();
}

// === Render Products ===
function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  filteredProducts.forEach(prod => {
    const name = getField(prod, "name");
    const desc = getField(prod, "desc");
    const photosRaw = getField(prod, "photos");
    const photos = photosRaw.split(/,|\n/).map(fixPhotoURL).filter(Boolean);
    const mainPhoto = photos[0] || "https://via.placeholder.com/300";
    const price = prod.price_uah || 0;

    const card = document.createElement("div");
    card.className = "product-card";

    const photo = document.createElement("img");
    photo.src = mainPhoto;
    photo.className = "main-photo";
    photo.addEventListener("click", () => openGallery(photos, 0));
    card.appendChild(photo);

    const title = document.createElement("h3");
    title.textContent = name;
    card.appendChild(title);

    const priceEl = document.createElement("p");
    priceEl.className = "price";
    priceEl.textContent = `${price} ₴`;
    card.appendChild(priceEl);

    const descBtn = document.createElement("button");
    descBtn.className = "desc-btn";
    descBtn.textContent = translations[currentLang].desc;
    const descText = document.createElement("p");
    descText.className = "desc-text hidden";
    descText.textContent = desc;
    descBtn.addEventListener("click", () => descText.classList.toggle("hidden"));
    card.appendChild(descBtn);
    card.appendChild(descText);

    const addBtn = document.createElement("button");
    addBtn.className = "buy-btn";
    addBtn.textContent = "🛒 " + (currentLang === "en" ? "Add" : currentLang === "ru" ? "Купить" : "Додати");
    addBtn.addEventListener("click", () => addToCart(name, price));
    card.appendChild(addBtn);

    list.appendChild(card);
  });
}

// === Gallery ===
function openGallery(photos, index) {
  galleryPhotos = photos;
  currentPhotoIndex = index;
  const modal = document.getElementById("photo-modal");
  document.getElementById("gallery-photo").src = galleryPhotos[currentPhotoIndex];
  modal.classList.remove("hidden");
}
function closeGallery() { document.getElementById("photo-modal").classList.add("hidden"); }
function nextPhoto() {
  currentPhotoIndex = (currentPhotoIndex + 1) % galleryPhotos.length;
  document.getElementById("gallery-photo").src = galleryPhotos[currentPhotoIndex];
}
function prevPhoto() {
  currentPhotoIndex = (currentPhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
  document.getElementById("gallery-photo").src = galleryPhotos[currentPhotoIndex];
}

// === Cart ===
function addToCart(name, price) {
  const found = cart.find(i => i.name === name);
  if (found) found.qty++;
  else cart.push({ name, price, qty: 1 });
  renderCart();
}

function renderCart() {
  const items = document.getElementById("cart-items");
  items.innerHTML = "";
  let total = 0;
  cart.forEach((i, idx) => {
    total += i.price * i.qty;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <span>${i.name}</span>
      <div class="qty">
        <button onclick="changeQty(${idx},-1)">−</button>
        <span>${i.qty}</span>
        <button onclick="changeQty(${idx},1)">+</button>
      </div>
      <span>${i.price * i.qty} ₴</span>`;
    items.appendChild(div);
  });
  const sum = document.createElement("p");
  sum.textContent = `Всього: ${total} ₴`;
  items.appendChild(sum);
  document.getElementById("cartCount").textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function changeQty(idx, d) {
  cart[idx].qty += d;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
}

document.getElementById("cart-btn").onclick = () => document.getElementById("cart-modal").classList.remove("hidden");
document.getElementById("close-cart").onclick = () => document.getElementById("cart-modal").classList.add("hidden");

// === Language ===
function changeLanguage(lang) {
  currentLang = lang;
  renderProducts();
  document.getElementById("catalog-title").textContent = translations[lang].catalog;
  document.getElementById("cart-title").textContent = translations[lang].cart;
  document.getElementById("checkout-btn").textContent = translations[lang].checkout;
}

// === Toggles ===
document.getElementById("categoryToggle").onclick = () => document.getElementById("categoryPanel").classList.toggle("hidden");
document.getElementById("filterToggle").onclick = () => document.getElementById("filterPanel").classList.toggle("hidden");
document.getElementById("applyFilters").onclick = applyFilters;
document.getElementById("langSelect").onchange = e => changeLanguage(e.target.value);

// === Init ===
document.addEventListener("DOMContentLoaded", loadProducts);