const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(port, () => console.log(`Server running on port ${port}`));

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = '8647547722:AAF2Cl97uDXWARQzeqgR9OVPyBejQ4xJmz0';
const GROUP_CHAT_ID = '-1003977957230'; 
const OWNER_USERNAME = '@VDChoudhary2';

const bot = new Telegraf(BOT_TOKEN);
let alertsList = [];
let userStates = {};

async function setBotCommandsMenu() {
    try {
        const commands = [
            { command: 'start', description: '🚀 Bot chalu karein' },
            { command: 'myalerts', description: '📊 Apne active alerts' },
            { command: 'cancel', description: '🗑️ Cancel alert' }
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
        // ... (baaki logic yahan rahega)
        return 0;
    } catch (err) { return 0; }
}

// Global Error Handler
process.on('uncaughtException', (err) => console.error('Fatal Error:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

// Bot Launch (Sirf EK BAAR)
bot.launch({ dropPendingUpdates: true }).then(async () => { 
    console.log('🚀 Bot is LIVE!');
    await setBotCommandsMenu(); 
}).catch((err) => console.error('Launch Error:', err));

// ... (baaki saare bot.on, bot.command, setInterval yahan paste karo)