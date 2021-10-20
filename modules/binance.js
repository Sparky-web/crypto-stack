import {MainClient, WebsocketClient} from "binance"

const publicKey = process.env.BINANCE_PUBLIC_KEY
const secretKey = process.env.BINANCE_SECRET_KEY

const client = new MainClient({
    api_key: publicKey,
    api_secret: secretKey,
});

const wsClient = new WebsocketClient({
    api_key: publicKey,
    api_secret: secretKey,
    beautify: true,
});


const getStack = async (coin1, coin2) => {
    return await client.getOrderBook({symbol: `${coin1}${coin2}`, limit: 1000})
}

const getStackByFullSymbol = async (symbol, limit = 500) => {
    return await client.getOrderBook({symbol, limit})
}

const getUSDTPairs = async () => {
    const {symbols} =  await client.getExchangeInfo()
    return symbols.map(e=>e.symbol).filter(e => e.slice(1).slice(-4) === "USDT")
}

export const _ = {getStack, getUSDTPairs, client, wsClient, getStackByFullSymbol}
export default _