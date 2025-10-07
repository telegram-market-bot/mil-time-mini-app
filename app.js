// ====== Налаштування: встав свій GAS веб-URL сюди (отриманий з Apps Script Deploy) ======
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxUbwEuAUkMXCCjOXxx1mjcoHcKdQxridfkC3t8NSWELXSvSLOdQI021QovdapkmYcs/exec";

// Якщо URL не містить action, додамо параметр для надійності:
const API_URL = SHEET_API_URL.includes('?') ? SHEET_API_URL + '&action=getProducts' : SHEET_API_URL + '?action=getProducts';

// ====== Глобальні змінні ======
let currentLang = "ua";
let PRODUCTS = [];
let cart = [];

// Стан фільтрів
const activeFilters = { category: null, season: null, color: null, size: null };

// Переклади інтерфейсу
const translations = {
  ua: { categories: "Категорії", seasons: "Сезон", colors: "Кольори", sizes: "Розміри", cart: "Кошик", catalog: "Каталог товарів", checkout: "Оформити" },
  en: { categories: "Categories", seasons: "Season", colors: "Colors", sizes: "Sizes", cart: "Cart", catalog: "Catalog", checkout: "Checkout" },
  ru: { categories: "Категории", seasons: "Сезон", colors: "Цвета", sizes: "Размеры", cart: "Корзина", catalog: "Каталог товаров", checkout: "Оформить" }
};

// ====== Утиліти ======
function getField(obj, base) {
  if (!obj) return null;
  // 1) локалізоване поле: name_ua/name_en...
  const keyLang = `${base}_${currentLang}`;
  if (obj.hasOwnProperty(keyLang) && obj[keyLang] !== '' && obj[keyLang] != null) return obj[keyLang];
  // 2) fallback: base (без суфікса)
  if (obj.hasOwnProperty(base) && obj[base] !== '' && obj[base] != null) return obj[base];
  // 3) fallback to ua
  if (obj.hasOwnProperty(`${base}_ua`)) return obj[`${base}_ua`];
  // nothing
  return null;
}

// ====== Завантаження товарів ======
async function loadProducts() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    // GAS може повертати масив або об'єкт {products: [...]}
    PRODUCTS = Array.isArray(json) ? json : (json.products || json);
    renderFilters();
    renderProducts();
  } catch (err) {
    console.error("Помилка завантаження:", err);
    const content = document.getElementById('product-list');
    if (content) content.innerHTML = `<p style="color:#f66;padding:12px">Помилка завантаження товарів. Перевір API.</p>`;
  }
}

// ====== Фільтри ======
function renderFilters() {
  const cats = new Set();
  const seasons = new Set();
  const colors = new Set();
  const sizes = new Set();

  PRODUCTS.forEach(p => {
    const c = getField(p, `category`);
    if (c) cats.add(c);
    const s = getField(p, `season`);
    if (s) seasons.add(s);
    // colors may be comma-separated
    const cols = (getField(p, `colors`) || '').toString().split(',').map(x=>x.trim()).filter(Boolean);
    cols.forEach(col => colors.add(col));
    const szs = (getField(p, `sizes`) || '').toString().split(',').map(x=>x.trim()).filter(Boolean);
    szs.forEach(sz => sizes.add(sz));
  });

  // helpers
  const buildChips = (set, containerId, type) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    // "Усі" chip
    const allChip = document.createElement('button');
    allChip.className = 'chip' + (activeFilters[type] === null ? ' active' : '');
    allChip.textContent = (currentLang === 'en' ? 'All' : (currentLang === 'ru' ? 'Все' : 'Всі'));
    allChip.onclick = () => { activeFilters[type] = null; renderFilters(); renderProducts(); };
    container.appendChild(allChip);

    Array.from(set).sort().forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (activeFilters[type] === v ? ' active' : '');
      btn.textContent = v;
      btn.onclick = () => {
        activeFilters[type] = activeFilters[type] === v ? null : v;
        renderFilters();
        renderProducts();
      };
      container.appendChild(btn);
    });
  };

  buildChips(cats, 'categories', 'category');
  buildChips(seasons, 'seasons', 'season');
  buildChips(colors, 'colors', 'color');
  buildChips(sizes, 'sizes', 'size');

  // update labels text
  document.getElementById('label-categories').textContent = translations[currentLang].categories;
  document.getElementById('label-seasons').textContent = translations[currentLang].seasons;
  document.getElementById('label-colors').textContent = translations[currentLang].colors;
  document.getElementById('label-sizes').textContent = translations[currentLang].sizes;
  document.getElementById('catalog-title').textContent = translations[currentLang].catalog;
  document.getElementById('cart-title').textContent = translations[currentLang].cart;
  document.getElementById('checkout-btn').textContent = translations[currentLang].checkout;
}

// ====== Рендер товарів ======
function renderProducts() {
  const list = document.getElementById("product-list");
  if (!list) return;
  list.innerHTML = "";

  const filtered = PRODUCTS.filter(prod => {
    // apply active filters
    if (activeFilters.category) {
      const c = getField(prod, 'category');
      if (c !== activeFilters.category) return false;
    }
    if (activeFilters.season) {
      const s = getField(prod, 'season');
      if (s !== activeFilters.season) return false;
    }
    if (activeFilters.color) {
      const cols = (getField(prod, 'colors') || '').toString().split(',').map(x=>x.trim());
      if (!cols.includes(activeFilters.color)) return false;
    }
    if (activeFilters.size) {
      const szs = (getField(prod, 'sizes') || '').toString().split(',').map(x=>x.trim());
      if (!szs.includes(activeFilters.size)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = `<p style="padding:12px">${currentLang === 'en' ? 'No products' : (currentLang === 'ru' ? 'Товаров не найдено' : 'Товари не знайдені')}</p>`;
    return;
  }

  filtered.forEach(prod => {
    const name = getField(prod, 'name') || '—';
    const desc = getField(prod, 'desc') || '';
    const photosRaw = getField(prod, 'photos') || getField(prod, 'photos_ua') || '';
    const photos = photosRaw.toString().split(',').map(x=>x.trim()).filter(Boolean);
    const mainPhoto = photos[0] || '';
    const price = prod.price_uah || prod.price || 0;

    // build card element safely (no inline onclick with quotes)
    const card = document.createElement('div');
    card.className = 'product-card';

    const img = document.createElement('img');
    img.src = mainPhoto;
    img.alt = name;
    card.appendChild(img);

    const h3 = document.createElement('h3');
    h3.textContent = name;
    card.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = desc;
    card.appendChild(p);

    const metaRow = document.createElement('div');
    metaRow.className = 'meta-row';

    const priceDiv = document.createElement('div');
    priceDiv.style.fontWeight = '700';
    priceDiv.textContent = `${price} ₴`;
    metaRow.appendChild(priceDiv);

    const btnDiv = document.createElement('div');
    const addBtn = document.createElement('button');
    addBtn.className = 'buy-btn';
    addBtn.textContent = (currentLang === 'en' ? 'Add' : (currentLang === 'ru' ? 'Купить' : 'Додати'));
    addBtn.addEventListener('click', () => addToCart(prod));
    btnDiv.appendChild(addBtn);
    metaRow.appendChild(btnDiv);

    card.appendChild(metaRow);

    list.appendChild(card);
  });

  updateCartCount();
}

// ====== Кошик ======
function addToCart(prod) {
  // find existing
  const id = prod.id || prod.sku || JSON.stringify(prod).slice(0,8);
  let item = cart.find(i => i.id === id);
  if (item) {
    item.qty += 1;
  } else {
    const name = getField(prod, 'name') || prod.name_ua || prod.name_en || '';
    const price = prod.price_uah || prod.price || 0;
    cart.push({ id, sku: prod.sku || '', name, price, qty: 1 });
  }
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((s,i)=>s+i.qty,0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

function showCart() {
  const modal = document.getElementById('cart-modal');
  modal.classList.remove('hidden');
  renderCart();
}

function closeCart() {
  const modal = document.getElementById('cart-modal');
  modal.classList.add('hidden');
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;
  if (!cart.length) {
    container.innerHTML = `<p>${currentLang === 'en' ? 'Cart is empty' : (currentLang === 'ru' ? 'Корзина пуста' : 'Кошик порожній')}</p>`;
    return;
  }
  container.innerHTML = '';
  cart.forEach((it, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.marginBottom = '8px';
    row.innerHTML = `<div>${it.name} × ${it.qty}</div><div>${it.price * it.qty} ₴</div>`;
    // controls
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '6px';
    const plus = document.createElement('button'); plus.textContent = '+'; plus.className='buy-btn';
    plus.onclick = ()=>{ it.qty++; renderCart(); updateCartCount(); };
    const minus = document.createElement('button'); minus.textContent = '−'; minus.className='buy-btn gray';
    minus.onclick = ()=>{ if(it.qty>1){ it.qty--; } else { cart.splice(idx,1); } renderCart(); updateCartCount(); };
    controls.appendChild(plus); controls.appendChild(minus);
    row.appendChild(controls);
    container.appendChild(row);
  });

  const total = cart.reduce((s,i)=>s + i.price * i.qty, 0);
  const totalDiv = document.createElement('div');
  totalDiv.style.marginTop = '12px';
  totalDiv.style.fontWeight = '700';
  totalDiv.textContent = `${currentLang === 'en' ? 'Total' : (currentLang === 'ru' ? 'Итого' : 'Всього')}: ${total} ₴`;
  container.appendChild(totalDiv);
}

// ====== Мова (UI) ======
function changeLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  // update labels and UI
  renderFilters(); // also updates labels
  renderProducts();
}

// ====== Ініціалізація подій ======
document.addEventListener('DOMContentLoaded', () => {
  // lang select
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => changeLanguage(e.target.value));
  }

  // cart button
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) cartBtn.addEventListener('click', showCart);

  // close cart
  const closeBtn = document.getElementById('close-cart');
  if (closeBtn) closeBtn.addEventListener('click', closeCart);

  // checkout - just demo (you'll connect to GAS createOrder later)
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
    alert(currentLang === 'en' ? 'Checkout demo' : (currentLang === 'ru' ? 'Оформление (демо)' : 'Оформлення (демо)'));
  });

  // load products
  loadProducts();
});