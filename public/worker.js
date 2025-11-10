// Cloudflare Worker (module) - NowPayments live integration
// Bindings required:
// - SECRET_NOW_API_KEY (secret)
// - SECRET_WEBHOOK_SECRET (secret for IPN signature verification)
// - ORDERS (KV namespace binding)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-nowpayments-sig'
};

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  try {
    if (path === '/api/create-payment' && request.method === 'POST') {
      return await handleCreate(request);
    } else if (path.startsWith('/api/order/') && request.method === 'GET') {
      const id = path.split('/').pop();
      return await handleGetOrder(id);
    } else if (path === '/webhook/payment' && request.method === 'POST') {
      return await handleWebhook(request);
    } else {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: JSON_HEADERS });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: JSON_HEADERS });
  }
}

async function handleCreate(request) {
  const body = await request.json().catch(()=>null);
  if (!body) return new Response(JSON.stringify({ message: 'Invalid JSON' }), { status: 400, headers: JSON_HEADERS });

  const { sendCoin, sendAmount, usdValue, receiveWallet, description } = body;
  if (!sendCoin || !sendAmount || !usdValue) {
    return new Response(JSON.stringify({ message: 'Missing required parameters' }), { status: 400, headers: JSON_HEADERS });
  }

  const orderId = 'NP' + cryptoRandomHex(12);

  const invoicePayload = {
    price_amount: parseFloat(usdValue),
    price_currency: 'usd',
    pay_currency: sendCoin.toLowerCase(),
    order_id: orderId,
    ipn_callback_url: `${new URL(request.url).origin}/webhook/payment`,
    description: description || `Payment for order ${orderId}`
  };

  const nowResp = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SECRET_NOW_API_KEY
    },
    body: JSON.stringify(invoicePayload)
  });

  const nowJson = await nowResp.json().catch(()=>({}));
  if (!nowResp.ok) {
    return new Response(JSON.stringify({ message: 'NowPayments error', detail: nowJson }), { status: 502, headers: JSON_HEADERS });
  }

  const order = {
    orderId,
    sendCoin,
    sendAmount,
    usdValue,
    receiveWallet,
    createdAt: new Date().toISOString(),
    status: nowJson.status || 'waiting',
    invoice: nowJson
  };

  await ORDERS.put(orderId, JSON.stringify(order));

  return new Response(JSON.stringify({ orderId, invoice: nowJson }), { status: 201, headers: JSON_HEADERS });
}

async function handleGetOrder(orderId) {
  if (!orderId) return new Response(JSON.stringify({ message: 'Missing orderId' }), { status: 400, headers: JSON_HEADERS });
  const data = await ORDERS.get(orderId);
  if (!data) return new Response(JSON.stringify({ message: 'Order not found' }), { status: 404, headers: JSON_HEADERS });
  return new Response(data, { status: 200, headers: JSON_HEADERS });
}

async function handleWebhook(request) {
  const raw = await request.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  const sigHeader = request.headers.get('x-nowpayments-sig') || request.headers.get('x-nowpayments-signature');
  if (!sigHeader) return new Response('Missing signature', { status: 400 });

  // Build signed string per NowPayments instruction: JSON.stringify(payload, Object.keys(payload).sort())
  const signed = JSON.stringify(payload, Object.keys(payload).sort());
  const expected = await hmacSha512(SECRET_WEBHOOK_SECRET, signed);
  if (expected !== sigHeader) {
    return new Response('Invalid signature', { status: 403 });
  }

  const orderId = payload.order_id || payload.orderId || (payload.invoice && payload.invoice.order_id);
  if (orderId) {
    const existing = await ORDERS.get(orderId);
    if (existing) {
      const order = JSON.parse(existing);
      order.status = payload.status || payload.payment_status || order.status;
      order.webhook = payload;
      order.updatedAt = new Date().toISOString();
      await ORDERS.put(orderId, JSON.stringify(order));
    } else {
      const newOrder = { orderId, status: payload.status || 'unknown', webhook: payload, createdAt: new Date().toISOString() };
      await ORDERS.put(orderId, JSON.stringify(newOrder));
    }
  }

  return new Response('OK', { status: 200 });
}

function cryptoRandomHex(len) {
  const arr = new Uint8Array(Math.ceil(len/2));
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('').slice(0,len);
}

async function hmacSha512(key, message) {
  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const msgData = enc.encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
}
