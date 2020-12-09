import * as dotenv from 'dotenv';
import { Telegraf, Context } from 'telegraf';
dotenv.config();

class Bot {
    private bot: Telegraf<Context>;


    private urlPattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*');

    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN ?? '');
        this.middleware();
        this.bot.launch();
        console.log("Bot started!");
    }

    private middleware(): void {
        this.bot.on("message", ctx => this.onMessage(ctx));
    }

    private async onMessage(ctx: Context) {
        if (ctx.chat?.username === "nicolatoscan") {

        }
    }

}

const bot = new Bot();
