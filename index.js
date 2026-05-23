const express = require('express');
const app = express();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf('8647547722:AAF2Cl97uDXWARQzeqgR9OVPyBejQ4xJmz0');
const GROUP_CHAT_ID = '-1003977957230';
let alertsList = [];

// 1. Keep-Alive Server
app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(process.env.PORT || 3000);

// 2. Core Functions
async function getLivePrice(asset) {
    try {
        if (asset === 'BTCUSDT' || asset === 'BTC') {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
            return parseFloat(res.data.price);
        }
        return 0;
    } catch (e) { return 0; }
}

// 3. Bot Commands
bot.start((ctx) => ctx.reply('Bot is live! Price check: /price'));

bot.command('price', async (ctx) => {
    const price = await getLivePrice('BTC');
    ctx.reply(`BTC Price: ${price}`);
});

// 4. Background Loop
setInterval(async () => {
    // Yahan aapka alert wala logic phir se add hoga
}, 3000);

// 5. Secure Launch
bot.launch({ dropPendingUpdates: true }).then(() => console.log('Bot is running!'));
process.on('uncaughtException', (err) => console.log(err));