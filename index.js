const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is active!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

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
            { command: 'start', description: '🚀 Bot chalu karein aur asset chunein' },
            { command: 'myalerts', description: '📊 Apne active alerts dekhein' },
            { command: 'cancel', description: '🗑️ Kisi alert ko delete/cancel karein' },
            { command: 'adminpanel', description: '⚙️ Total active group alerts (Only Owner)' }
        ];
        await bot.telegram.setMyCommands(commands, { scope: { type: 'all_private_chats' } });
        await bot.telegram.setMyCommands(commands, { scope: { type: 'all_group_chats' } });
        console.log('🎯 SUCCESS: Telegram Shortcut Menu is now FORCED globally!');
    } catch (err) {
        console.log('⚠️ Menu Error:', err.message);
    }
}

async function getLivePrice(asset) {
    try {
        let symbol = asset.toUpperCase();
        let tvTicker = "";
        if (symbol === 'BTCUSDT' || symbol === 'BTC') {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { timeout: 3000 });
            return parseFloat(res.data.price);
        }
        if (symbol === 'XAUUSD' || symbol === 'GOLD') tvTicker = "OANDA:XAUUSD";
        else if (symbol === 'USDJPY') tvTicker = "OANDA:USDJPY";
        else if (symbol === 'EURUSD') tvTicker = "OANDA:EURUSD";

        if (tvTicker) {
            const response = await axios.post('https://scanner.tradingview.com/global/scan', {
                symbols: { tickers: [tvTicker], query: { types: [] } },
                columns: ["close"]
            }, { timeout: 3000 });
            if (response.data && response.data.data && response.data.data[0]) {
                return parseFloat(response.data.data[0].d[0]);
            }
        }
        return 0;
    } catch (err) {
        if (asset.toUpperCase() === 'USDJPY') return 155.85;
        if (asset.toUpperCase() === 'EURUSD') return 1.0852;
        return 0;
    }
}

bot.start((ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) {
        return ctx.reply(`⚠️ *Access Denied!*`, { parse_mode: 'Markdown' });
    }
    delete userStates[ctx.from.id];
    ctx.reply(`👋 Hello *${ctx.from.first_name}*!`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🪙 BTCUSDT', 'select_BTCUSDT'), Markup.button.callback('🏆 XAUUSD', 'select_XAUUSD')],
            [Markup.button.callback('💱 USDJPY', 'select_USDJPY'), Markup.button.callback('🇪🇺 EURUSD', 'select_EURUSD')]
        ])
    });
});

bot.command('myalerts', (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const myAlerts = alertsList.filter(a => a.user === username);
    if (myAlerts.length === 0) return ctx.reply(`📊 ${username}, koi active alert nahi hai.`);
    let replyText = `📋 *Aapke Active Alerts:* \n\n`;
    myAlerts.forEach((a, index) => { replyText += `${index + 1}. 🪙 *${a.asset}* -> Target: *${a.target}*\n`; });
    ctx.reply(replyText, { parse_mode: 'Markdown' });
});

bot.command('cancel', (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const myAlerts = alertsList.filter(a => a.user === username);
    if (myAlerts.length === 0) return ctx.reply(`📊 Cancel karne ke liye koi alert nahi mila.`);
    let buttons = myAlerts.map((a, index) => [Markup.button.callback(`❌ Cancel ${index + 1}`, `cancel_${username}_${index}`)]);
    ctx.reply(`🗑️ Select karein:`, Markup.inlineKeyboard(buttons));
});

bot.command('adminpanel', (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    if (username !== OWNER_USERNAME) return ctx.reply('❌ Reserved!');
    ctx.reply(`⚙️ Total Active Alerts: *${alertsList.length}*`, { parse_mode: 'Markdown' });
});

bot.action(/^select_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const asset = ctx.match[1];
    const userId = ctx.from.id;
    userStates[userId] = { asset: asset, waitingForPrice: true, timestamp: Date.now() };
    const currentPrice = await getLivePrice(asset);
    ctx.reply(`🎯 Select kiya: *${asset}*. Current Rate: *${currentPrice}*. 30 second mein Target Price bhejiye:`, { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;
    const userId = ctx.from.id;
    if (!userStates[userId] || !userStates[userId].waitingForPrice) return;
    const targetPrice = parseFloat(ctx.message.text.trim());
    if (isNaN(targetPrice)) return ctx.reply(`❌ Sirf number bhejiye!`);
    const asset = userStates[userId].asset;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const currentPrice = await getLivePrice(asset);
    const direction = currentPrice < targetPrice ? 'UP' : 'DOWN';
    alertsList.push({ user: username, asset: asset, target: targetPrice, direction: direction, chatId: ctx.chat.id });
    ctx.reply(`✅ *Alert Locked!* 🚀\nAsset: ${asset}\nTarget: ${targetPrice}`, { parse_mode: 'Markdown' });
    delete userStates[userId];
});

bot.action(/^cancel_(.+)_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const targetUser = ctx.match[1];
    const indexToCancel = parseInt(ctx.match[2]);
    const clickedUser = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    if (clickedUser !== targetUser) return ctx.reply(`❌ Dusro ka cancel nahi kar sakte!`);
    alertsList = alertsList.filter((_, i) => i !== indexToCancel);
    ctx.editMessageText(`🗑️ *Alert Cancelled!*`, { parse_mode: 'Markdown' });
});

setInterval(async () => {
    if (alertsList.length === 0) return;
    for (let alert of alertsList) {
        const currentPrice = await getLivePrice(alert.asset);
        if (currentPrice === 0) continue;
        let isTriggered = (alert.direction === 'UP' && currentPrice >= alert.target) || (alert.direction === 'DOWN' && currentPrice <= alert.target);
        if (isTriggered) {
            await bot.telegram.sendMessage(alert.chatId, `🔔 *TARGET HIT!* ${alert.asset} @ ${alert.target}`, { parse_mode: 'Markdown' });
            alertsList = alertsList.filter(a => a !== alert);
        }
    }
}, 3000);

process.on('uncaughtException', (err) => console.error('Fatal Error:', err));

// --- YEH HAI ASLI SOLUTION ---
bot.launch({ dropPendingUpdates: true }).then(() => {
    console.log('🚀 Bot is Live!');
    setBotCommandsMenu();
});