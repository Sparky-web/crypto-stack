import {MainClient, WebsocketClient} from "binance"
import axios from "axios"

import dotenv from "dotenv";

dotenv.config()

const publicKey = process.env.BINANCE_PUBLIC_KEY
const secretKey = process.env.BINANCE_SECRET_KEY
const isTestMode = process.env.TEST_MODE === "true"

const client = new MainClient({
    api_key: publicKey,
    api_secret: secretKey
});

const testClient = new MainClient({
    api_key: "7Y69ygwzy28zxvn2xiNXt2nKTWFE7CSClh9yfG5Jqjq3AI07DYwptaOqdijpB0Uh",
    api_secret: "wndAClZPC0gpglJ4EmMnKU9E7cmzpRoWERmqJDQdJcmNHfC4h7HfHckrPKZbmZ7p",
    baseUrl: "https://testnet.binance.vision"
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
    const {symbols} = await client.getExchangeInfo()
    return symbols.map(e => e.symbol).filter(e => e.slice(1).slice(-4) === "USDT")
}
const buy = async (ticker, amount, price) => {
    const {data: info} = await axios.get(`https://api.binance.com/api/v3/exchangeInfo?symbol=${ticker}USDT`)

    const {symbols: [{filters: [{tickSize}, {}, {stepSize}]}]} = info

    let pricePrecision = tickSize.split(".")[1].split("1")[0].length + 1
    let amountPrecision = stepSize.split(".")[1].split("1")[0].length + 1

    const params = {
        symbol: `${ticker}USDT`,
        side: "BUY",
        type: "LIMIT",
        quantity: +(amount.toFixed(amountPrecision)),
        price: +(price.toFixed(pricePrecision)),
        timeInForce: "GTC"
    }

    return isTestMode ? await testClient.submitNewOrder(params) : await client.submitNewOrder(params)
}

const cancelIfNotFilled = async (symbol, orderId) => {
    const actualClient = isTestMode ? testClient : client

    const order = await actualClient.getOrder({
        symbol,
        orderId
    })

    if (order.status !== "FILLED") return await actualClient.cancelOrder({
        symbol,
        orderId
    })
}


export const _ = {getStack, getUSDTPairs, client, wsClient, getStackByFullSymbol, buy, testClient, cancelIfNotFilled}
export default _
