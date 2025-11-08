// Check environment variables
console.log('Environment Variables Check:');
console.log('NOW_API_KEY:', process.env.NOW_API_KEY ? 'SET' : 'NOT SET');
console.log('WEBHOOK_SECRET:', process.env.WEBHOOK_SECRET ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

if (process.env.NOW_API_KEY) {
    console.log('NOW_API_KEY length:', process.env.NOW_API_KEY.length);
    console.log('NOW_API_KEY starts with:', process.env.NOW_API_KEY.substring(0, 10) + '...');
}