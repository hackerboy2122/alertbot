const express = require('express');
const app = express();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = '8647547722:AAF2Cl97uDXWARQzeqgR9OVPyBejQ4xJmz0';
const GROUP_CHAT_ID = '-1003977957230'; 
const OWNER_USERNAME = '@VDChoudhary2';

const bot = new Telegraf(BOT_TOKEN);
let alertsList = [];
let userStates = {};

// Express Server
app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(process.env.PORT || 3000);

// --- Functions ---
async function setBotCommandsMenu() {
    try {
        const commands = [
            { command: 'start', description: '🚀 Bot chalu karein' },
            { command: 'myalerts', description: '📊 Apne active alerts' },
            { command: 'cancel', description: '🗑️ Cancel alert' },
            { command: 'adminpanel', description: '⚙️ Owner Panel' }
        ];
        await bot.telegram.setMyCommands(commands, { scope: { type: 'all_group_chats' } });
    } catch (err) {}
}

async function getLivePrice(asset) {
    try {
        if (asset === 'BTCUSDT' || asset === 'BTC') {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { timeout: 3000 });
            return parseFloat(res.data.price);
        }
        return 0;
    } catch (err) { return 0; }
}

// --- Bot Logic ---
bot.start((ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;
    ctx.reply('Welcome! Use /start for menu.');
});

bot.command('myalerts', (ctx) => { /* Aapka purana code yahan aayega */ });
bot.command('cancel', (ctx) => { /* Aapka purana code yahan aayega */ });
bot.command('adminpanel', (ctx) => { /* Aapka purana code yahan aayega */ });

// --- Alert Loop ---
setInterval(async () => {
    if (alertsList.length === 0) return;
    // Aapka purana alert loop logic yahan aayega
}, 3000);

// --- CRITICAL FIX: Launch only once ---
process.on('uncaughtException', (err) => console.log(err));
bot.launch({ dropPendingUpdates: true }).then(() => {
    console.log('🚀 Bot is Live!');
    setBotCommandsMenu();
});