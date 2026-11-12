const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createProductStore } = require('./services/productService');
const { handleProductRequest } = require('./controllers/productController');

function createStore(dataFile = process.env.DB_PATH || path.join(__dirname, 'data', 'store.json')) {
  const store = createProductStore(dataFile);

  function sendJson(res, status, data, headers = {}) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    });
    res.end(JSON.stringify(data));
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);

      if (parts[0] === 'api' && parts[1] === 'products') {
        return await handleProductRequest(req, res, store);
      }

      if (parts[0] !== 'api') {
        if (!['GET', 'HEAD'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed.' });

        let target = '';
        if (url.pathname === '/assets/bootstrap/bootstrap.min.css') {
          target = path.resolve(__dirname, '../assets/bootstrap/bootstrap.min.css');
        } else {
          const name = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
          if (!/^(?:[a-zA-Z0-9_-]+\.html|app\.js|images\/[a-zA-Z0-9_-]+\.svg)$/.test(name)) {
            return sendJson(res, 404, { error: 'Not found.' });
          }
          target = path.join(__dirname, name);
        }

        if (!fs.existsSync(target)) return sendJson(res, 404, { error: 'Not found.' });

        const types = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css',
          '.svg': 'image/svg+xml'
        };

        res.writeHead(200, {
          'Content-Type': types[path.extname(target)] || 'application/octet-stream',
          'X-Content-Type-Options': 'nosniff'
        });

        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(target).pipe(res);
        return;
      }

      return sendJson(res, 404, { error: 'Endpoint not found.' });
    } catch (err) {
      if (err.status) {
        return sendJson(res, err.status, { error: err.message });
      }

      console.error(err);
      return sendJson(res, 500, { error: 'Internal server error.' });
    }
  });

  return server;
}

if (require.main === module) {
  createStore().listen(process.env.PORT || 3000, '127.0.0.1', () => {
    console.log(`Store: http://localhost:${process.env.PORT || 3000}`);
  });
}

module.exports = { createStore };

