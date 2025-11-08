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
            paymentAddress.textContent = 'tb1qxyz...'; // Mock address
            
            // Generate QR code
            generateQRCode('tb1qxyz...'); // Mock address
            
            // Start timer
            startTimer();
        } else {
            alert('Order not found');
        }
    } catch (error) {
        console.error('Error fetching order:', error);
        alert('Error fetching order details');
    }
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
            alert('Error checking payment status');
        }
    } catch (error) {
        console.error('Error checking status:', error);
        alert('Error checking payment status');
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