const axios = require('axios');
require('dotenv').config();

// Test NowPayments API connectivity
async function testNowPayments() {
  console.log('Testing NowPayments API connectivity...');
  console.log('API Key:', process.env.NOW_API_KEY ? 'SET' : 'NOT SET');
  
  if (!process.env.NOW_API_KEY) {
    console.log('ERROR: NOW_API_KEY is not set in environment variables');
    return;
  }
  
  try {
    // Test API key validity
    console.log('Testing API status...');
    const statusResponse = await axios.get('https://api.nowpayments.io/v1/status', {
      headers: {
        'x-api-key': process.env.NOW_API_KEY
      }
    });
    
    console.log('API Status:', statusResponse.data);
    
    // Test creating a small invoice
    console.log('Creating test invoice...');
    const invoiceData = {
      price_amount: 10,
      price_currency: 'usd',
      pay_currency: 'btc',
      order_id: 'test_' + Date.now(),
      order_description: 'Test invoice',
      ipn_callback_url: 'https://your-domain.com/webhook/payment?secret=test',
      success_url: 'https://your-domain.com/success',
      cancel_url: 'https://your-domain.com/cancel'
    };
    
    console.log('Invoice Data:', JSON.stringify(invoiceData, null, 2));
    
    const invoiceResponse = await axios.post('https://api.nowpayments.io/v1/invoice', invoiceData, {
      headers: {
        'x-api-key': process.env.NOW_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Invoice Response Status:', invoiceResponse.status);
    console.log('Invoice Response Headers:', invoiceResponse.headers);
    console.log('Invoice Response Data:', JSON.stringify(invoiceResponse.data, null, 2));
    
  } catch (error) {
    console.error('NowPayments API Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response Headers:', error.response.headers);
    } else {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testNowPayments();