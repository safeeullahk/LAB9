const money = n => `PKR ${n.toLocaleString('en-PK')}`;
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url, method='GET', body) {
  const response=await fetch(`/api/${url}`,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const contentType=response.headers.get('content-type') || '';
  const result=contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof result === 'object' && result && result.error ? result.error : 'Request failed.';
    throw new Error(message);
  }
  return result;
}
function error(e) {
  let box=document.querySelector('#api-message');
  if(!box){box=document.createElement('div');box.id='api-message';box.className='container alert alert-danger mt-3';box.setAttribute('role','alert');document.querySelector('main').prepend(box);}
  box.textContent=e.message;
  box.scrollIntoView({block:'nearest'});
}
function summary(c) {return `<div class="card p-4 mt-4"><h2 class="h5">Order summary</h2><p>Subtotal: ${money(c.subtotal)}</p><p>Delivery: ${money(c.shipping)}</p><strong>Total: ${money(c.total)}</strong></div>`;}
async function renderCart(){
  const c=await api('cart'); const section=document.querySelector('main section');
  section.innerHTML='<h1>Your cart</h1>'+(c.items.length?c.items.map(p=>`<div class="bg-white border rounded p-3 my-3 d-flex flex-wrap align-items-center gap-3"><img src="${escapeHtml(p.image)}" width="96" alt=""><div class="flex-grow-1"><h2 class="h5">${escapeHtml(p.name)}</h2><p>${money(p.price)} each</p><label>Quantity <input class="form-control" type="number" min="1" max="99" value="${p.quantity}" data-quantity="${escapeHtml(p.id)}"></label></div><strong>${money(p.lineTotal)}</strong><button class="btn btn-outline-danger" data-remove="${escapeHtml(p.id)}">Remove</button></div>`).join('')+summary(c)+'<a class="btn btn-dark mt-3" href="checkout.html">Continue to checkout &rarr;</a>':'<p>Your cart is empty.</p>')+'<p class="mt-4"><a href="index.html#products">Continue shopping</a></p>';
  section.querySelectorAll('[data-quantity]').forEach(input=>input.onchange=async()=>{try{await api(`cart/items/${input.dataset.quantity}`,'PATCH',{quantity:Number(input.value)});await renderCart();}catch(e){error(e);}});
  section.querySelectorAll('[data-remove]').forEach(button=>button.onclick=async()=>{try{await api(`cart/items/${button.dataset.remove}`,'DELETE');await renderCart();}catch(e){error(e);}});
}
async function init(){
  const page=location.pathname.split('/').pop() || 'index.html';

  if(page==='index.html'){
    const products=await api('products');
    document.querySelector('#products .row').innerHTML=products.map(p=>`<div class="col"><article class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden"><img src="${escapeHtml(p.image)}" class="card-img-top" width="360" height="300" alt="${escapeHtml(p.name)}"><div class="card-body p-4 d-flex flex-column"><p class="small text-secondary">${escapeHtml(p.category)}</p><h3 class="h5">${escapeHtml(p.name)}</h3><p class="small text-secondary flex-grow-1">${escapeHtml(p.description)}</p><strong class="mb-3">${money(p.price)}</strong><button class="btn btn-dark" data-add="${escapeHtml(p.id)}" type="button">View product</button></div></article></div>`).join('');
    document.querySelector('#products > .small').textContent='Simple product catalog with create, read, update, and delete operations.';
    document.querySelector('#products .d-flex > span').textContent=`${products.length} curated essentials`;
    document.querySelectorAll('[data-add]').forEach(button=>button.onclick=()=>{window.location.href='index.html#products';});
  }

  if(page==='login.html' || page==='signup.html'){
    const form=document.querySelector('form');
    if(form){
      form.previousElementSibling.textContent='This demo uses the product CRUD API only. Login and signup are disabled for the simplified version.';
      form.removeAttribute('action');
      form.method='get';
      form.onsubmit=async e=>{e.preventDefault();location.href='index.html';};
      const button=form.querySelector('button');
      if(button) button.textContent=page==='signup.html' ? 'Continue to catalog' : 'Go to catalog';
    }
  }

  if(page==='cart.html'){
    const main=document.querySelector('main');
    try {
      const cart=await api('cart');
      main.innerHTML=`<section class="container py-5"><h1>Your cart</h1>${cart.items && cart.items.length ? cart.items.map(item => `<p>${escapeHtml(item.name)} &times; ${item.quantity}</p>`).join('') : '<p>The cart is empty.</p>'}<p class="mt-3"><a href="index.html" class="btn btn-dark">Continue shopping</a></p></section>`;
    } catch {
      main.innerHTML=`<section class="container py-5"><h1>Your cart</h1><p>This CRUD-only demo does not use a cart API.</p><p><a href="index.html" class="btn btn-dark">Back to catalog</a></p></section>`;
    }
    return;
  }

  if(page==='checkout.html' || page==='confirmation.html'){
    location.href='index.html';
    return;
  }
}
init().catch(err => {
  console.error(err);
  if (document.querySelector('main')) {
    error(err);
  }
});
