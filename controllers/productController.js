function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 65536) reject(fail(413, 'Request too large.'));
    });

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(fail(400, 'Invalid JSON.'));
      }
    });

    req.on('error', reject);
  });
}

async function handleProductRequest(req, res, store) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'api' || parts[1] !== 'products') {
    return sendJson(res, 404, { error: 'Endpoint not found.' });
  }

  const productId = parts[2];
  const existing = productId ? store.getProductById(productId) : null;

  if (productId && !existing) fail(404, 'Product not found.');

  let body = {};
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = await parseBody(req);
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, productId ? existing : store.getAllProducts());
  }

  if (req.method === 'POST' && !productId) {
    const product = store.createProduct(body);
    return sendJson(res, 201, product);
  }

  if (['PUT', 'PATCH'].includes(req.method) && productId) {
    const product = store.updateProduct(productId, body);
    return sendJson(res, 200, product);
  }

  if (req.method === 'DELETE' && productId) {
    const result = store.deleteProduct(productId);
    return sendJson(res, 200, result);
  }

  return sendJson(res, 405, { error: 'Method not allowed.' });
}

module.exports = { handleProductRequest };
