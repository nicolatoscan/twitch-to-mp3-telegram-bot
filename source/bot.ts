import * as dotenv from 'dotenv';
import { Telegraf, Context } from 'telegraf';
import { execSync } from 'child_process';
import * as fs from 'fs';
dotenv.config();

const urlPattern = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*');

const bot = new Telegraf(process.env.BOT_TOKEN ?? '');
middleware();
bot.launch();
console.log("Bot started!");

function middleware(): void {
    bot.on("message", ctx => onMessage(ctx));
}

let counter = 0;
async function onMessage(ctx: Context) {
    if (ctx.chat?.username === "nicolatoscan") {
        const msgs = ctx.message?.text?.split(' ') ?? [];
        if (msgs.length >= 1 && urlPattern.test(msgs[0])) {
            const myCounter = ++counter;

            const url = msgs[0];
            await ctx.reply('Downloading ...');
            execSync(`rm -rf ${myCounter}`, { cwd: 'download' });
            execSync(`mkdir -p ${myCounter}`, { cwd: 'download' });
            execSync(`mkdir -p ${myCounter}/res`, { cwd: 'download' });
            execSync(`twitch-dl download -q 160p ${url}`, { cwd: `download/${myCounter}` });

            const files = fs.readdirSync(`download/${myCounter}`);

            if (files.length < 1) {
                await ctx.reply('Error downlaod');
                return;
            }

            await ctx.reply('Parsing ...');
            const filename = files[0];
            const outFilename = `${filename.split('.')[0]}.mp3`;
            execSync(`ffmpeg -i ${filename} -vn -f mp3 -ab 128000 ${outFilename}`, { cwd: `download/${myCounter}` });

            await ctx.reply('Splitting ...');
            execSync(`ffmpeg -i ${outFilename} -f segment -segment_time 1800 -c copy res/%03d-${outFilename}`, { cwd: `download/${myCounter}` });

            await ctx.reply('Uploading ...');
            try {
                for (const f of fs.readdirSync(`download/${myCounter}/res`)) {
                    await ctx.replyWithDocument({
                        source: await fs.readFileSync(`download/${myCounter}/res/${f}`),
                        filename: f
                    });
                }
            } catch {
                await ctx.reply('File too large (probably)');
            }

            execSync(`rm -rf ${myCounter}`, { cwd: 'download' });
            await ctx.reply('Done');
        }
    }
}