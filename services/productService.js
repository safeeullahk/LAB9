const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function createProductStore(dataFile = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'store.json')) {
  const seedProducts = [
    { id: 'headphones', name: 'Studio Headphones', description: 'Over-ear comfort, rich sound, and a foldable design.', category: 'Audio', price: 12900, image: 'images/headphones.svg' },
    { id: 'backpack', name: 'Everyday Backpack', description: 'A lightweight carry with a padded laptop sleeve.', category: 'Carry', price: 8500, image: 'images/backpack.svg' },
    { id: 'lamp', name: 'Arc Desk Lamp', description: 'Warm light for focused evenings and quiet reading.', category: 'Workspace', price: 6200, image: 'images/lamp.svg' },
    { id: 'bottle', name: 'Daily Steel Bottle', description: 'Reusable stainless steel for everyday adventures.', category: 'Lifestyle', price: 3400, image: 'images/bottle.svg' }
  ];

  function loadState() {
    if (dataFile === ':memory:') return { products: seedProducts };

    const dir = path.dirname(dataFile);
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(dataFile)) {
      try {
        const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        if (saved && Array.isArray(saved.products)) return saved;
      } catch {
        // ignore bad file and start fresh
      }
    }

    return { products: seedProducts };
  }

  function saveState(state) {
    if (dataFile === ':memory:') return;
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
  }

  const state = loadState();

  function normalizeProduct(input, fallback = {}) {
    return {
      id: String(input.id || fallback.id || randomUUID()),
      name: String(input.name ?? fallback.name ?? '').trim(),
      description: String(input.description ?? fallback.description ?? '').trim(),
      category: String(input.category ?? fallback.category ?? '').trim(),
      image: String(input.image ?? fallback.image ?? '').trim(),
      price: Number(input.price ?? fallback.price ?? 0)
    };
  }

  function getAllProducts() {
    return state.products;
  }

  function getProductById(id) {
    return state.products.find(product => product.id === id) || null;
  }

  function createProduct(payload) {
    const product = normalizeProduct(payload);
    if (!product.name || !product.description || !product.category || !product.image) {
      const err = new Error('Product data is invalid.');
      err.status = 400;
      throw err;
    }

    const nextPrice = Number(product.price);
    if (!Number.isInteger(nextPrice) || nextPrice <= 0) {
      const err = new Error('Price must be a positive whole number.');
      err.status = 400;
      throw err;
    }

    product.price = nextPrice;
    state.products.push(product);
    saveState(state);
    return product;
  }

  function updateProduct(id, payload) {
    const existing = getProductById(id);
    if (!existing) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    const product = normalizeProduct({ ...existing, ...payload }, existing);
    if (!product.name || !product.description || !product.category || !product.image) {
      const err = new Error('Product data is invalid.');
      err.status = 400;
      throw err;
    }

    const nextPrice = Number(product.price);
    if (!Number.isInteger(nextPrice) || nextPrice <= 0) {
      const err = new Error('Price must be a positive whole number.');
      err.status = 400;
      throw err;
    }

    product.price = nextPrice;
    const index = state.products.findIndex(item => item.id === id);
    state.products[index] = product;
    saveState(state);
    return product;
  }

  function deleteProduct(id) {
    const existing = getProductById(id);
    if (!existing) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    state.products = state.products.filter(item => item.id !== id);
    saveState(state);
    return { message: 'Product deleted.' };
  }

  return {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
  };
}

module.exports = { createProductStore };
