// Get order ID from URL
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('order_id');

// DOM Elements
const sendAmount = document.getElementById('sendAmount');
const receiveAmount = document.getElementById('receiveAmount');
const receiveMethod = document.getElementById('receiveMethod');
const receiveWallet = document.getElementById('receiveWallet');
const paymentAddress = document.getElementById('paymentAddress');
const timer = document.getElementById('timer');
const paymentStatus = document.getElementById('paymentStatus');
const checkStatusBtn = document.getElementById('checkStatusBtn');

let countdown;
let timeLeft = 20 * 60; // 20 minutes in seconds

// Fetch order details
async function fetchOrderDetails() {
    if (!orderId) {
        alert('Invalid order ID');
        return;
    }
    
    try {
        const response = await fetch(`/api/order/${orderId}`);
        const order = await response.json();
        
        if (response.ok) {
            // Populate order details
            sendAmount.textContent = `${order.amount} ${order.coin}`;
            receiveAmount.textContent = `${order.usd_value} USD`;
            receiveMethod.textContent = order.receive_method;
            receiveWallet.textContent = order.receive_wallet;
            // Use the payment address from the order or generate a mock one
            const address = order.payment_address || generateMockAddress(order.receive_method);
            paymentAddress.textContent = address;
            
            // Generate QR code
            generateQRCode(address);
            
            // Start timer
            startTimer();
        } else {
            // If order not found, try to generate mock data
            generateMockOrderData();
        }
    } catch (error) {
        console.error('Error fetching order:', error);
        // If there's an error, generate mock data
        generateMockOrderData();
    }
}

// Generate mock address based on receive method
function generateMockAddress(method) {
    if (method && method.includes('TRC20')) {
        return 'T' + Math.random().toString(36).substring(2, 30).toUpperCase();
    } else {
        return '0x' + Math.random().toString(36).substring(2, 30);
    }
}

// Generate mock order data when real data is not available
function generateMockOrderData() {
    // Generate mock data
    const coins = ['BTC', 'ETH'];
    const methods = ['USDT (TRC20)', 'USDT (ERC20)'];
    
    const coin = coins[Math.floor(Math.random() * coins.length)];
    const amount = (Math.random() * 10).toFixed(4);
    const usdValue = (amount * (coin === 'BTC' ? 165870 : 5909)).toFixed(2);
    const method = methods[Math.floor(Math.random() * methods.length)];
    const wallet = method.includes('TRC20') ? 
        'T' + Math.random().toString(36).substring(2, 30).toUpperCase() : 
        '0x' + Math.random().toString(36).substring(2, 30);
    const address = generateMockAddress(method);
    
    // Populate with mock data
    sendAmount.textContent = `${amount} ${coin}`;
    receiveAmount.textContent = `${usdValue} USD`;
    receiveMethod.textContent = method;
    receiveWallet.textContent = wallet;
    paymentAddress.textContent = address;
    
    // Generate QR code
    generateQRCode(address);
    
    // Start timer
    startTimer();
    
    alert('Showing demo data. Real order not found.');
}

// Generate QR code
function generateQRCode(address) {
    const qrCodeElement = document.getElementById('qrcode');
    qrCodeElement.innerHTML = ''; // Clear previous QR code
    
    new QRCode(qrCodeElement, {
        text: address,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Start countdown timer
function startTimer() {
    countdown = setInterval(() => {
        timeLeft--;
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            timer.textContent = '00:00';
            timer.style.color = 'red';
            alert('Payment time expired!');
        } else {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Check payment status
async function checkPaymentStatus() {
    if (!orderId) return;
    
    try {
        const response = await fetch(`/api/order/${orderId}`);
        const order = await response.json();
        
        if (response.ok) {
            paymentStatus.textContent = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            
            if (order.status === 'paid') {
                paymentStatus.style.color = 'green';
                clearInterval(countdown);
                alert('Payment successful! Thank you for using One⚡Cash.');
            }
        } else {
            paymentStatus.textContent = 'Pending';
        }
    } catch (error) {
        console.error('Error checking status:', error);
        paymentStatus.textContent = 'Pending';
    }
}

// Event listener for check status button
checkStatusBtn.addEventListener('click', checkPaymentStatus);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    fetchOrderDetails();
    
    // Check status every 30 seconds
    setInterval(checkPaymentStatus, 30000);
});