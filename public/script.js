// Fixed rates for coins
const FIXED_RATES = {
    BTC: 165870,
    ETH: 5909
};

// DOM Elements
const getStartedBtn = document.getElementById('getStartedBtn');
const exchangeSection = document.getElementById('exchangeSection');
const exchangeForm = document.getElementById('exchangeForm');
const selectCoin = document.getElementById('selectCoin');
const enterAmount = document.getElementById('enterAmount');
const usdConversion = document.getElementById('usdConversion');
const receiveMethod = document.getElementById('receiveMethod');
const walletAddress = document.getElementById('walletAddress');

// Scroll to exchange section when Get Started is clicked
getStartedBtn.addEventListener('click', () => {
    exchangeSection.scrollIntoView({ behavior: 'smooth' });
});

// Calculate USD conversion when amount or coin changes
enterAmount.addEventListener('input', calculateUSD);
selectCoin.addEventListener('change', calculateUSD);

function calculateUSD() {
    const coin = selectCoin.value;
    const amount = parseFloat(enterAmount.value);
    
    if (coin && !isNaN(amount) && amount > 0) {
        const rate = FIXED_RATES[coin];
        if (rate) {
            const usdValue = (amount * rate).toFixed(2);
            usdConversion.value = `${usdValue} USD`;
        }
    } else {
        usdConversion.value = '';
    }
}

// Handle form submission
exchangeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const coin = selectCoin.value;
    const amount = enterAmount.value;
    const receiveMethodValue = receiveMethod.value;
    const walletAddressValue = walletAddress.value;
    
    // Validate form
    if (!coin || !amount || !receiveMethodValue || !walletAddressValue) {
        alert('Please fill in all fields');
        return;
    }
    
    // Prepare data
    const data = {
        coin: coin,
        amount: parseFloat(amount),
        receiveMethod: receiveMethodValue,
        receiveWallet: walletAddressValue
    };
    
    try {
        // Show loading state
        const submitBtn = exchangeForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;
        
        // Send request to backend
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        // Restore button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        if (result.success) {
            // Redirect to payment page
            window.location.href = result.redirect_url;
        } else {
            alert('Error: ' + (result.error || 'Failed to create payment'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        
        // Restore button
        const submitBtn = exchangeForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Exchange Now';
        submitBtn.disabled = false;
    }
});