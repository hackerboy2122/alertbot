// Environment Variable hata kar seedha token daalo (sirf testing ke liye)
const BOT_TOKEN = '8647547722:AAEvD1kj6gverh31WKTYTc-tZw3GQMf7Pz4';
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

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = '-1003977957230'; 
const OWNER_USERNAME = '@VDChoudhary2'; // Admin / Owner Username

const bot = new Telegraf(BOT_TOKEN);
let alertsList = []; // Active alerts ki list
let userStates = {}; // Users ki state mapping

// 🔥 FORCE REFRESH CORNER MENU SYSTEM
async function setBotCommandsMenu() {
    try {
        const commands = [
            { command: 'start', description: '🚀 Bot chalu karein aur asset chunein' },
            { command: 'myalerts', description: '📊 Apne active alerts dekhein' },
            { command: 'cancel', description: '🗑️ Kisi alert ko delete/cancel karein' },
            { command: 'adminpanel', description: '⚙️ Total active group alerts (Only Owner)' }
        ];

        // 1. Set for Private DMs
        await bot.telegram.setMyCommands(commands, { scope: { type: 'all_private_chats' } });
        
        // 2. Set for All Groups (Strictly forces menu button near emoji in group chats)
        await bot.telegram.setMyCommands(commands, { scope: { type: 'all_group_chats' } });

        console.log('🎯 SUCCESS: Telegram Shortcut Menu is now FORCED globally!');
    } catch (err) {
        console.log('⚠️ Menu Error:', err.message);
    }
}

// TradingView & Binance Real-Time Price Engine
async function getLivePrice(asset) {
    try {
        let symbol = asset.toUpperCase();
        let tvTicker = "";

        if (symbol === 'BTCUSDT' || symbol === 'BTC') {
            const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { timeout: 10000 });
            return parseFloat(res.data.price);
        }
        
        if (symbol === 'XAUUSD' || symbol === 'GOLD') tvTicker = "OANDA:XAUUSD";
        else if (symbol === 'USDJPY') tvTicker = "OANDA:USDJPY";
        else if (symbol === 'EURUSD') tvTicker = "OANDA:EURUSD";

        if (tvTicker) {
            const response = await axios.post('https://scanner.tradingview.com/global/scan', {
                symbols: { tickers: [tvTicker], query: { types: [] } },
                columns: ["close"]
            }, { timeout: 10000 });

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

// 1. /start Command (Security Guard + Main Menu)
bot.start((ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) {
        return ctx.reply(`⚠️ *Access Denied!* \n\nBhai, aap is bot ko use karne ke liye authorized nahi hain. Agar aapko access chahiye, toh please owner ko message karein:\n👉 ${OWNER_USERNAME}`, { parse_mode: 'Markdown' });
    }

    delete userStates[ctx.from.id];

    ctx.reply(`👋 Hello *${ctx.from.first_name}*! Price alert lagane ke liye asset select karein ya niche diye commands use karein:\n\n📊 *Commands:* \n👉 /myalerts - Apne active alerts dekhein\n👉 /cancel - Kisi alert ko delete karein`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🪙 BTCUSDT (Binance)', 'select_BTCUSDT'), Markup.button.callback('🏆 XAUUSD (OANDA Live)', 'select_XAUUSD')],
            [Markup.button.callback('💱 USDJPY (OANDA Live)', 'select_USDJPY'), Markup.button.callback('🇪🇺 EURUSD (OANDA Live)', 'select_EURUSD')]
        ])
    }).then((msg) => {
        setTimeout(() => { ctx.deleteMessage(msg.message_id).catch(() => {}); }, 45000);
    }).catch(() => {});
});

// 2. /myalerts Command Handler
bot.command('myalerts', (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;
    
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const myAlerts = alertsList.filter(a => a.user === username);

    if (myAlerts.length === 0) {
        return ctx.reply(`📊 ${username}, aapka abhi koi bhi active alert nahi chal raha hai.`);
    }

    let replyText = `📋 *Aapke Active Alerts:* \n\n`;
    myAlerts.forEach((a, index) => {
        replyText += `${index + 1}. 🪙 *${a.asset}* -> Target: *${a.target}* (${a.direction})\n`;
    });
    ctx.reply(replyText, { parse_mode: 'Markdown' });
});

// 3. /cancel Command Handler
bot.command('cancel', (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;

    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const myAlerts = alertsList.filter(a => a.user === username);

    if (myAlerts.length === 0) {
        return ctx.reply(`📊 Cancel karne ke liye aapka koi active alert nahi mila.`);
    }

    let buttons = myAlerts.map((a, index) => [
        Markup.button.callback(`❌ Cancel ${index + 1}: ${a.asset} @ ${a.target}`, `cancel_${username}_${index}`)
    ]);

    ctx.reply(`🗑️ Kis alert ko cancel karna chahte hain? Niche click karein:`, Markup.inlineKeyboard(buttons));
});

// 4. /adminpanel Command Handler (Owner Panel)
bot.command('adminpanel', (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;

    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    if (username !== OWNER_USERNAME) {
        return ctx.reply('❌ Yeh command sirf bot owner ke liye reserved hai!');
    }

    let replyText = `⚙️ *OWNER CONTROL PANEL* ⚙️\n\n📊 Total Active Alerts Running: *${alertsList.length}*\n\n`;
    if (alertsList.length > 0) {
        alertsList.forEach((a, i) => {
            replyText += `🔹 [${i + 1}] User: ${a.user} | ${a.asset} @ ${a.target}\n`;
        });
    } else {
        replyText += `💤 Filhaal group me koi alert active nahi hai.`;
    }
    ctx.reply(replyText, { parse_mode: 'Markdown' });
});

// 5. Button Click Handler
bot.action(/^select_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;

    const asset = ctx.match[1];
    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    userStates[userId] = {
        asset: asset,
        username: username,
        waitingForPrice: true,
        timestamp: Date.now()
    };

    const currentPrice = await getLivePrice(asset);
    
    ctx.reply(`🎯 ${username}, aapne *${asset}* select kiya hai.\n📊 Live Rate: *${currentPrice}*\n\n✍️ Agle 30 second ke andar apna *Target Price* type karke bhejiye:`, { parse_mode: 'Markdown' })
    .then((msg) => {
        setTimeout(() => {
            if (userStates[userId] && userStates[userId].waitingForPrice && userStates[userId].asset === asset) {
                delete userStates[userId];
                ctx.deleteMessage(msg.message_id).catch(() => {});
            }
        }, 30000);
    });
});

// 6. User Price Text Handler
bot.on('text', async (ctx) => {
    if (ctx.chat.id.toString() !== GROUP_CHAT_ID) return;

    const userId = ctx.from.id;

    if (!userStates[userId] || !userStates[userId].waitingForPrice) return;
    if (Date.now() - userStates[userId].timestamp > 30000) { delete userStates[userId]; return; }

    const targetPrice = parseFloat(ctx.message.text.trim());
    const asset = userStates[userId].asset;
    const username = userStates[userId].username;

    if (isNaN(targetPrice)) {
        return ctx.reply(`❌ ${username} please sirf ek sahi number bhejiye!`).catch(() => {});
    }

    const currentPrice = await getLivePrice(asset);
    if (currentPrice === 0) return;

    const direction = currentPrice < targetPrice ? 'UP' : 'DOWN';

    alertsList.push({
        user: username, asset: asset, target: targetPrice, direction: direction, chatId: ctx.chat.id
    });

    ctx.reply(`✅ *Alert Locked Successfully!* 🚀\n\n👤 *User:* ${username}\n🪙 *Asset:* ${asset}\n🎯 *Target:* ${targetPrice}\n📊 *Current Price:* ${currentPrice}`, { 
        parse_mode: 'Markdown'
    });

    delete userStates[userId];
});

// 7. Cancel Action Callback Handler
bot.action(/^cancel_(.+)_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const targetUser = ctx.match[1];
    const indexToCancel = parseInt(ctx.match[2]);
    const clickedUser = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    if (clickedUser !== targetUser) {
        return ctx.reply(`❌ Aap kisi aur ka alert cancel nahi kar sakte!`);
    }

    let userAlertsCount = 0;
    let globalIndexToRemove = -1;

    for (let i = 0; i < alertsList.length; i++) {
        if (alertsList[i].user === targetUser) {
            if (userAlertsCount === indexToCancel) {
                globalIndexToRemove = i;
                break;
            }
            userAlertsCount++;
        }
    }

    if (globalIndexToRemove !== -1) {
        const removed = alertsList.splice(globalIndexToRemove, 1)[0];
        ctx.editMessageText(`🗑️ *Alert Cancelled Successfully!* \n\n🪙 Asset: *${removed.asset}* ki *${removed.target}* waali entry hata di gayi hai.`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply('❌ Alert nahi mila ya pehle se trigger ho chuka hai.');
    }
});

// 8. Background Ultra-Fast Trigger Loop
setInterval(async () => {
    if (alertsList.length === 0) return;
    let remainingAlerts = [];
    let priceCache = {};

    for (let alert of alertsList) {
        try {
            if (!priceCache[alert.asset]) {
                priceCache[alert.asset] = await getLivePrice(alert.asset);
            }

            const currentPrice = priceCache[alert.asset];
            if (currentPrice === 0) { remainingAlerts.push(alert); continue; }

            let isTriggered = false;
            if (alert.direction === 'UP' && currentPrice >= alert.target) isTriggered = true;
            if (alert.direction === 'DOWN' && currentPrice <= alert.target) isTriggered = true;

            if (isTriggered) {
                const alertText = `🔔 📣 *TARGET HIT HO GAYA!* 📣 🔔\n\n⚠️ Attention: ${alert.user}\n\n🚀 Aapka lagaya hua target hit ho chuka hai!\n🪙 *Asset:* ${alert.asset}\n🎯 *Target Level:* ${alert.target}\n📈 *Live Price Right Now:* ${currentPrice}\n\n⚡ _Apne trades check kijiye!_`;
                await bot.telegram.sendMessage(alert.chatId, alertText, { parse_mode: 'Markdown' });
            } else {
                remainingAlerts.push(alert);
            }
        } catch (e) { remainingAlerts.push(alert); }
    }
    alertsList = remainingAlerts;
}, 3000);

bot.catch(() => {});

// Global Error Handler
process.on('uncaughtException', (err) => {
    console.error('Fatal Error:', err);
});

// Bot Launch - Ye code best hai 409 Conflict hataane ke liye
bot.launch({ dropPendingUpdates: true })
  .then(() => {
    console.log('🚀 Bot is Live and Conflict Free!');
    setBotCommandsMenu();
  })
  .catch((err) => {
    console.error('Launch Error:', err);
    process.exit(1); // Agar error aaye toh restart ke liye force karega
  });