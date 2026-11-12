const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createStore } = require('../server');

test('product CRUD API works and persists', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'store-crud-'));
  let server, base;

  async function start() {
    server = createStore(path.join(dir, 'store.json'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  }

  async function stop() {
    await new Promise(resolve => server.close(resolve));
  }

  async function request(route, method = 'GET', body, status = 200) {
    const res = await fetch(base + '/api/' + route, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    assert.equal(res.status, status, await res.clone().text());
    return res.headers.get('content-type')?.includes('application/json') ? res.json() : res.text();
  }

  try {
    await start();

    const initial = await request('products');
    assert.equal(initial.length, 4);

    const created = await request('products', 'POST', {
      name: 'Test product',
      description: 'Simple product',
      category: 'Test',
      price: 500,
      image: 'images/bottle.svg'
    }, 201);

    assert.equal(created.name, 'Test product');
    assert.equal(created.price, 500);

    const one = await request('products/' + created.id, 'GET');
    assert.equal(one.name, 'Test product');

    const patched = await request('products/' + created.id, 'PATCH', { price: 600 }, 200);
    assert.equal(patched.price, 600);

    const bad = await request('products/' + created.id, 'PATCH', { price: -1 }, 400);
    assert.equal(bad.error, 'Price must be a positive whole number.');

    await request('products/' + created.id, 'DELETE', undefined, 200);
    await request('products/' + created.id, 'GET', undefined, 404);

    await stop();
    await start();

    const afterRestart = await request('products');
    assert.equal(afterRestart.some(product => product.name === 'Test product'), false);
  } finally {
    if (server?.listening) await stop();
    rmSync(dir, { recursive: true, force: true });
  }
});
