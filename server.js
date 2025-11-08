const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fixed rates for coins
const FIXED_RATES = {
  BTC: 165870,
  ETH: 5909
};

// Payment methods
const PAYMENT_METHODS = [
  'USDT (TRC20)',
  'USDT (ERC20)'
];

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the payment page
app.get('/payment.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment.html'));
});

// API endpoint to get fixed rates
app.get('/api/rates', (req, res) => {
  res.json(FIXED_RATES);
});

// API endpoint to get payment methods
app.get('/api/payment-methods', (req, res) => {
  res.json(PAYMENT_METHODS);
});

// API endpoint to create payment
app.post('/api/create-payment', async (req, res) => {
  try {
    const { coin, amount, receiveMethod, receiveWallet } = req.body;
    
    // Validate inputs
    if (!coin || !amount || !receiveMethod || !receiveWallet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!FIXED_RATES[coin]) {
      return res.status(400).json({ error: 'Invalid coin type' });
    }
    
    if (!PAYMENT_METHODS.includes(receiveMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    // Calculate USD value
    const usdValue = (amount * FIXED_RATES[coin]).toFixed(2);
    
    // Generate order ID
    const orderId = 'NP' + Date.now() + Math.floor(Math.random() * 1000);
    
    // Create order object
    const order = {
      order_id: orderId,
      coin: coin,
      amount: amount,
      usd_value: usdValue,
      receive_method: receiveMethod,
      receive_wallet: receiveWallet,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    // Save order to file
    saveOrder(order);
    
    // Generate mock payment address based on receive method
    let paymentAddress = '';
    if (receiveMethod.includes('TRC20')) {
      paymentAddress = 'T' + Math.random().toString(36).substring(2, 30).toUpperCase();
    } else {
      paymentAddress = '0x' + Math.random().toString(36).substring(2, 30);
    }
    
    // Return success response with mock data
    res.json({
      success: true,
      order_id: orderId,
      payment_address: paymentAddress,
      payment_url: `https://nowpayments.io/payment/${orderId}`,
      redirect_url: `/payment.html?order_id=${orderId}`
    });
    
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook endpoint for payment status updates
app.post('/webhook/payment', (req, res) => {
  try {
    const secret = req.query.secret;
    
    // Verify webhook secret
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { order_id, status } = req.body;
    
    // Update order status
    updateOrderStatus(order_id, status);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to save order to file
function saveOrder(order) {
  let orders = [];
  
  // Read existing orders
  if (fs.existsSync('orders.json')) {
    const data = fs.readFileSync('orders.json');
    orders = JSON.parse(data);
  }
  
  // Add new order
  orders.push(order);
  
  // Write updated orders
  fs.writeFileSync('orders.json', JSON.stringify(orders, null, 2));
}

// Function to update order status
function updateOrderStatus(orderId, status) {
  if (fs.existsSync('orders.json')) {
    const data = fs.readFileSync('orders.json');
    let orders = JSON.parse(data);
    
    // Find and update order
    const orderIndex = orders.findIndex(order => order.order_id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].status = status;
      orders[orderIndex].updated_at = new Date().toISOString();
      
      // Write updated orders
      fs.writeFileSync('orders.json', JSON.stringify(orders, null, 2));
    }
  }
}

// Function to generate mock payment address
function generateMockPaymentAddress(coin, method) {
  const prefixes = {
    'BTC': 'bc1',
    'ETH': '0x'
  };
  
  const prefix = prefixes[coin] || '0x';
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  return prefix + randomPart;
}

// Get order details
app.get('/api/order/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if orders.json file exists
    if (!fs.existsSync('orders.json')) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const data = fs.readFileSync('orders.json', 'utf8');
    
    // Check if file is empty
    if (!data || data.trim() === '') {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orders = JSON.parse(data);
    
    const order = orders.find(order => order.order_id === orderId);
    
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    // If there's a parsing error, return not found instead of internal error
    res.status(404).json({ error: 'Order not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;