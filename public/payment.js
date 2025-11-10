<script>
  const rates = { ETH: 5841.60, BTC: 158941.60 };

  function calculateExchange() {
    const coin = document.getElementById('coin').value;
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const receiveAmountEl = document.getElementById('receive-amount');
    const rate = rates[coin] || 1;
    const received = amount * rate;
    receiveAmountEl.textContent = isNaN(received) ? '0.00' : received.toFixed(6);
  }

  async function createInvoice() {
    const button = document.getElementById('exchange-button');
    const resultDiv = document.getElementById('result');

    const coin = document.getElementById('coin').value;
    const amount = document.getElementById('amount').value;
    const receiveWallet = document.getElementById('receive-wallet').value;
    const walletAddress = document.getElementById('wallet-address').value;

    if (!amount || parseFloat(amount) <= 0) {
      resultDiv.textContent = 'Please enter a valid amount.';
      resultDiv.style.color = 'red';
      return;
    }

    if (!walletAddress) {
      resultDiv.textContent = 'Please enter your wallet address.';
      resultDiv.style.color = 'red';
      return;
    }

    button.disabled = true;
    button.textContent = 'CREATING INVOICE...';
    resultDiv.textContent = '';

    try {
      const response = await fetch('https://api.onncx.com', { // আপনার Worker URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coin: coin,
          amount: amount,
          receiveWallet: receiveWallet,
          walletAddress: walletAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.payment_id) {
        // সফলভাবে ইনভয়েস তৈরি হলে payment.html পেজে payment_id সহ রিডাইরেক্ট করুন
        window.location.href = `payment.html?payment_id=${data.payment_id}`;
      } else {
        resultDiv.textContent = data.message || 'Failed to create invoice. Please try again.';
        resultDiv.style.color = 'red';
        button.disabled = false;
        button.textContent = 'EXCHANGE NOW';
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.textContent = 'An error occurred. Please try again later.';
      resultDiv.style.color = 'red';
      button.disabled = false;
      button.textContent = 'EXCHANGE NOW';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    calculateExchange();
  });
</script>