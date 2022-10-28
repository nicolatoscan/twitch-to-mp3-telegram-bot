import * as dotenv from 'dotenv';
import { Telegraf, Context } from 'telegraf';
import { execSync } from 'child_process';
import * as fs from 'fs';
dotenv.config();

const urlPattern = /^(https?:\/\/)?(www\.)?twitch\.tv(\/[-a-z\d%_.~+]*)*/;
const allowedUsers = process.env.ALLOWED_USERS?.split(',') ?? [];

const bot = new Telegraf(process.env.BOT_TOKEN ?? '');
bot.command('ping', ctx => ctx.reply('pong!'));
bot.on('message', ctx => onMessage(ctx));
bot.launch();
console.log('Bot twitch-to-mp3 started!');

async function onMessage(ctx: Context) {
    if (ctx.chat?.username && allowedUsers.includes(ctx.chat.username)) {
        const msgs = ctx.message?.text?.split(' ') ?? [];
        if (msgs.length >= 1 && urlPattern.test(msgs[0])) {
            const url = msgs[0];
            await ctx.reply('OK');
            saveAndSend(ctx.chat.id, url);
        }
    }
}

let counter = 0;
async function saveAndSend(chatId: number, url: string) {
    const myCounter = ++counter;
    console.log(`Starting ${myCounter}`);

    await bot.telegram.sendMessage(chatId, 'Downloading ...');
    execSync(`rm -rf ${myCounter}`, { cwd: 'download' });
    execSync(`mkdir -p ${myCounter}`, { cwd: 'download' });
    execSync(`mkdir -p ${myCounter}/res`, { cwd: 'download' });
    execSync(`twitch-dl download -q 160p ${url}`, { cwd: `download/${myCounter}` });

    const files = fs.readdirSync(`download/${myCounter}`);

    if (files.length < 1) {
        await bot.telegram.sendMessage(chatId, 'Error downlaod');
        return;
    }

    await bot.telegram.sendMessage(chatId, 'Parsing ...');
    const filename = files[0];
    const outFilename = `${filename.split('.')[0]}.mp3`;
    execSync(`ffmpeg -i ${filename} -vn -f mp3 -ab 128000 ${outFilename}`, { cwd: `download/${myCounter}` });

    await bot.telegram.sendMessage(chatId, 'Splitting ...');
    execSync(`ffmpeg -i ${outFilename} -f segment -segment_time 1800 -c copy res/%03d-${outFilename}`, { cwd: `download/${myCounter}` });

    await bot.telegram.sendMessage(chatId, 'Uploading ...');
    try {
        for (const f of fs.readdirSync(`download/${myCounter}/res`)) {
            await bot.telegram.sendDocument(chatId, {
                source: await fs.readFileSync(`download/${myCounter}/res/${f}`),
                filename: f
            });
        }
    } catch {
        await bot.telegram.sendMessage(chatId, 'File too large (probably)');
    }

    execSync(`rm -rf ${myCounter}`, { cwd: 'download' });
    console.log(`Completed ${myCounter}`);
    await bot.telegram.sendMessage(chatId, 'Done');
}