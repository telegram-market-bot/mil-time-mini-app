const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Полноэкранный режим

// Данные товаров (замени на fetch из Google Sheets или MyDrop API)
const products = [
  { id: 1, name: {ru: 'Форма A-TACS', ua: 'Форма A-TACS', en: 'A-TACS Uniform'}, category: 'Формы', season: 'Зима', color: 'Камуфляж', sizes: 'S,M,L', price: 3500, photos: ['url1.jpg', 'url2.jpg', 'url3.jpg'], desc: {ru: 'Водонепроницаемая', ua: 'Водонепроникна', en: 'Waterproof'}, stock: true },
  // Добавь 500+ похожих
];

let cart = [];
let lang = tg.initDataUnsafe.user.language_code || 'ru'; // Авто-язык

// Обновление интерфейса по языку/теме
tg.onEvent('themeChanged', () => {
  document.body.style.backgroundColor = tg.themeParams.bg_color;
  renderCatalog();
});

document.getElementById('language').addEventListener('change', (e) => {
  lang = e.target.value;
  renderCatalog();
});

// Рендер каталога с фильтрами и каруселью фото
function renderCatalog() {
  const catalog = document.getElementById('catalog');
  catalog.innerHTML = '';
  // Фильтры (заполни опции из products)
  // ... (добавь логику для dropdowns)

  products.forEach(product => {
    if (/* фильтры */) { // Добавь условия по category, season и т.д.
      const div = document.createElement('div');
      div.innerHTML = `
        <h3>${product.name[lang]}</h3>
        <div class="carousel">
          ${product.photos.map(url => `<img src="${url}" alt="Ракурс">`).join('')}
        </div>
        <p>${product.desc[lang]} - ${product.price} ₴</p>
        <button onclick="addToCart(${product.id})">В корзину</button>
      `;
      catalog.appendChild(div);
    }
  });
}

// Корзина
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (product.stock) cart.push(product);
  updateCart();
}

function updateCart() {
  const items = document.getElementById('cart-items');
  items.innerHTML = cart.map(p => `<p>${p.name[lang]} - ${p.price} ₴</p>`).join('');
  document.getElementById('total').textContent = cart.reduce((sum, p) => sum + p.price, 0) + ' ₴';
}

// Оформление заказа (Telegram Payments)
document.getElementById('checkout').addEventListener('click', () => {
  tg.openInvoice('https://your-invoice-url?total=' + total.textContent, (status) => {
    if (status === 'paid') alert('Оплачено!'); // Интегрируй с MyDrop
  });
});

// ИИ-бот (простой, интегрируй Hugging Face API free)
document.getElementById('ask').addEventListener('click', () => {
  const q = document.getElementById('question').value;
  fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased', { // Замени на твой модель
    method: 'POST',
    body: JSON.stringify({inputs: q}),
  }).then(res => res.json()).then(data => alert(data[0].generated_text)); // Базовый ответ
});

// Интеграция MyDrop (fetch наличие)
function syncStock() {
  fetch('https://mydrop.com.ua/api/stock?key=YOUR_KEY').then(res => res.json()).then(data => {
    products.forEach(p => p.stock = data[p.id]);
    renderCatalog();
  });
}

renderCatalog();
syncStock(); // Авто-синхр