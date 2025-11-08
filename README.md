# One⚡Cash Exchange & Payment System

A complete cryptocurrency exchange system with fixed-rate conversion and payment processing.

## Features

- Fixed rate cryptocurrency exchange (BTC, ETH to USDT)
- Support for TRC20 and ERC20 networks
- Real-time USD conversion
- QR code payment generation
- 20-minute payment timer
- Order status tracking
- Webhook integration for payment confirmation

## Deployment to Vercel

1. Create a GitHub repository with this code
2. Sign up/log in to [Vercel](https://vercel.com)
3. Click "New Project" and import your GitHub repository
4. Configure the project:
   - Framework Preset: Other
   - Build Command: `npm install`
   - Output Directory: `.`
5. Add environment variables in Vercel dashboard:
   - `NOW_API_KEY` - Your NOWPayments API key
   - `WEBHOOK_SECRET` - Your webhook secret
6. Deploy!

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with your credentials:
   ```
   NOW_API_KEY=your_nowpayments_api_key_here
   WEBHOOK_SECRET=your_webhook_secret_here
   PORT=3000
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Visit `http://localhost:3000`

## How It Works

1. User selects cryptocurrency and enters amount
2. System calculates USD value using fixed rates
3. User selects receiving method (USDT TRC20/ERC20) and enters wallet address
4. Upon submission, order is created and user redirected to payment page
5. Payment page displays QR code and payment address
6. Timer counts down from 20 minutes
7. When payment is made, NOWPayments webhook updates order status
8. Order details are stored in `orders.json`

## Fixed Rates

- BTC: $165,870 USD
- ETH: $5,909 USD

## File Structure

```
├── public/
│   ├── index.html       # Main exchange page
│   ├── payment.html     # Payment page
│   ├── styles.css       # Styling
│   ├── script.js        # Exchange page logic
│   └── payment.js       # Payment page logic
├── server.js            # Backend server
├── orders.json          # Order database (generated)
├── .env                 # Environment variables
├── package.json         # Dependencies
└── vercel.json          # Vercel configuration
```

## Security

- API keys stored in environment variables
- Webhook verification with secret
- No sensitive data exposed to frontend