const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxUbwEuAUkMXCCjOXxx1mjcoHcKdQxridfkC3t8NSWELXSvSLOdQI021QovdapkmYcs/exec";

let currentLang = "ua";
let cart = [];

async function loadProducts() {
  try {
    const res = await fetch(SHEET_API_URL);
    const data = await res.json();
    renderProducts(data);
  } catch (err) {
    console.error("Помилка завантаження:", err);
  }
}

function renderProducts(products) {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  products.forEach(prod => {
    const name = prod[`name_${currentLang}`];
    const desc = prod[`desc_${currentLang}`];
    const photos = prod.photos ? prod.photos.split(",") : [];
    const mainPhoto = photos[0]?.trim();

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${mainPhoto}" alt="${name}">
      <h3>${name}</h3>
      <p>${desc}</p>
      <p><strong>${prod.price_uah} ₴</strong></p>
      <button class="buy-btn" onclick="addToCart('${prod.id}', '${name}', ${prod.price_uah})">🛒 Додати</button>
    `;
    list.appendChild(card);
  });
}

function addToCart(id, name, price) {
  cart.push({ id, name, price });
  updateCartCount();
}

function updateCartCount() {
  document.getElementById("cart-count").innerText = cart.length;
}

// Вибір мови
document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    loadProducts();
  });
});

// Кошик
document.getElementById("cart-btn").addEventListener("click", () => {
  const modal = document.getElementById("cart-modal");
  modal.classList.remove("hidden");
  renderCart();
});

document.getElementById("close-cart").addEventListener("click", () => {
  document.getElementById("cart-modal").classList.add("hidden");
});

function renderCart() {
  const container = document.getElementById("cart-items");
  container.innerHTML = cart.map(item => `<p>${item.name} — ${item.price} ₴</p>`).join("");
}

document.addEventListener("DOMContentLoaded", loadProducts);