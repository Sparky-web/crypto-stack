import {MainClient} from "binance"

const publicKey = process.env.BINANCE_PUBLIC_KEY
const secretKey = process.env.BINANCE_SECRET_KEY

const client = new MainClient({
    api_key: publicKey,
    api_secret: secretKey,
});

const getStack = async (coin1, coin2) => {
    return await client.getOrderBook({symbol: `${coin1}${coin2}`, limit: 1000})
}

const getUSDTPairs = async () => {
    const {symbols} =  await client.getExchangeInfo()
    return symbols.map(e=>e.symbol).filter(e => e.slice(1).slice(-4) === "USDT")
}

export const _ = {getStack, getUSDTPairs}
export default _