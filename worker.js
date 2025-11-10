// Cloudflare Worker (module) to handle NowPayments invoice creation and webhook
// Bindings required in Workers dashboard or wrangler.toml:
// - SECRET_NOW_API_KEY (Secret variable, your NOWPayments API key)
// - SECRET_WEBHOOK_SECRET (Secret variable, your NowPayments IPN / webhook secret)
// - ORDERS (KV namespace binding)
//
// Endpoints:
// POST  /api/create-payment   -> create invoice via NowPayments; stores order in KV
// GET   /api/order/:orderId   -> return stored order data
// POST  /webhook/payment      -> receive NowPayments IPN, verify signature, update order in KV
//
// Notes:
// - Do NOT expose SECRET_NOW_API_KEY to the frontend.
// - Bind ORDERS KV namespace to persist orders.

import { Hmac } from 'fast-sha512'; // fast-sha512 is available in Workers? If not, we will use Web Crypto below.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (pathname === '/api/create-payment' && request.method === 'POST') {
        return handleCreatePayment(request, env);
      }
      if (pathname.startsWith('/api/order/') && request.method === 'GET') {
        const orderId = pathname.split('/').pop();
        return handleGetOrder(orderId, env);
      }
      if (pathname === '/webhook/payment' && request.method === 'POST') {
        return handleWebhook(request, env);
      }

      // Fallback: serve 404
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders() });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: jsonHeaders() });
    }
  }
};

function jsonHeaders() {
  return {
    'Content-Type': 'application/json',
    ...corsHeaders()
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-nowpayments-sig'
  };
}

async function handleCreatePayment(request, env) {
  const body = await request.json().catch(()=>null);
  if (!body) return new Response(JSON.stringify({ message: 'Invalid JSON' }), { status: 400, headers: jsonHeaders() });

  // validate minimal fields
  const { sendCoin, sendAmount, usdValue, receiveWallet, description } = body;
  if (!sendCoin || !sendAmount || !usdValue) {
    return new Response(JSON.stringify({ message: 'Missing required parameters' }), { status: 400, headers: jsonHeaders() });
  }

  // Generate orderId
  const orderId = 'NP' + cryptoRandomHex(12);

  // Prepare invoice payload for NowPayments
  // Use production API endpoint. For sandbox testing use https://api-sandbox.nowpayments.io/v1
  const invoicePayload = {
    price_amount: parseFloat(usdValue),
    price_currency: 'usd',
    pay_currency: sendCoin.toLowerCase(), // e.g. 'btc' 'eth'
    order_id: orderId,
    ipn_callback_url: `${new URL(request.url).origin}/webhook/payment`,
    // Optional metadata
    description: description || `Payment for order ${orderId}`
  };

  const nowResp = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.SECRET_NOW_API_KEY
    },
    body: JSON.stringify(invoicePayload)
  });
  const nowJson = await nowResp.json();

  if (!nowResp.ok) {
    return new Response(JSON.stringify({ message: 'NowPayments error', detail: nowJson }), { status: 502, headers: jsonHeaders() });
  }

  // Store order in KV
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

  await env.ORDERS.put(orderId, JSON.stringify(order));

  return new Response(JSON.stringify({ orderId, invoice: nowJson }), { status: 201, headers: jsonHeaders() });
}

async function handleGetOrder(orderId, env) {
  if (!orderId) return new Response(JSON.stringify({ message: 'Missing orderId' }), { status: 400, headers: jsonHeaders() });
  const v = await env.ORDERS.get(orderId);
  if (!v) return new Response(JSON.stringify({ message: 'Order not found' }), { status: 404, headers: jsonHeaders() });
  return new Response(v, { status: 200, headers: jsonHeaders() });
}

async function handleWebhook(request, env) {
  // Read raw text body (important for signature verification)
  const rawBody = await request.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Verify signature using HMAC-SHA512
  const sigHeader = request.headers.get('x-nowpayments-sig') || request.headers.get('x-nowpayments-signature');
  if (!sigHeader) {
    return new Response('Missing signature', { status: 400 });
  }

  // According to NowPayments docs: sign JSON.stringify(params, Object.keys(params).sort()) with IPN secret using HMAC-SHA512
  const signedString = JSON.stringify(payload, Object.keys(payload).sort());
  const expectedSig = await hmacSha512(env.SECRET_WEBHOOK_SECRET, signedString);

  if (expectedSig !== sigHeader) {
    // signature mismatch - ignore
    return new Response('Invalid signature', { status: 403 });
  }

  // Update order in KV if order_id present
  const orderId = payload.order_id || payload.orderId || (payload.invoice && payload.invoice.order_id);
  if (orderId) {
    const existing = await env.ORDERS.get(orderId);
    if (existing) {
      const order = JSON.parse(existing);
      order.status = payload.status || payload.payment_status || order.status;
      order.webhook = payload;
      order.updatedAt = new Date().toISOString();
      await env.ORDERS.put(orderId, JSON.stringify(order));
    } else {
      // optionally create a record if missing
      const newOrder = {
        orderId,
        status: payload.status || 'unknown',
        webhook: payload,
        createdAt: new Date().toISOString()
      };
      await env.ORDERS.put(orderId, JSON.stringify(newOrder));
    }
  }

  return new Response('OK', { status: 200 });
}

// helper: crypto-safe random hex
function cryptoRandomHex(len) {
  // len is number of hex characters
  const arr = new Uint8Array(Math.ceil(len/2));
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('').slice(0,len);
}

// helper: HMAC SHA-512 using Web Crypto, return hex string
async function hmacSha512(key, message) {
  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const msgData = enc.encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
}
