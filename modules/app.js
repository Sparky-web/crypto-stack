import express from "express";
import binance from "./binance.js";
import state from "./state.js";
import {formatDistance} from "date-fns";
import ru from "date-fns/locale/ru/index.js"

const launchApp = async () => {
    const app = express()

    app.get("/", async (req, res) => {
        try {
            let {coin2, coin1, output, type} = req.query

            if (!(coin1 && coin2)) throw new Error("Нужно передать как минимум coin1 и coin2 параметры")

            const {text, json} = type === "buy" ? await getBuyInfo(req.query) : await getSellInfo(req.query)

            res.send(output === "text" ? text : json)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.send(e.stack || e)
        }
    })

    app.get("/buy", buy)

    await app.listen(process.env.PORT)

    return app
}

const getSellInfo = async (params) => {
    let {coin2, coin1, rate, amount, minutesBack} = params

    const data = minutesBack ? state.pairs[`${coin1}${coin2}`].history[minutesBack - 1] : await binance.getStack(coin1, coin2)
    let asks = rate ? data.bids.filter(e => (+e[0] >= +rate)) : data.bids

    let ratesJson = asks.map(e => ({amount: +e[1], rate: +e[0]}))
    let ratesMsg = asks.map(e => `${e[1]} ${coin1} по ${e[0]} ${coin2}`).join("<br />")

    let availableToSell = 0
    let priceToSell = 0

    for (let rate of ratesJson) {
        if (rate.amount + availableToSell >= amount) {
            priceToSell += (amount - availableToSell) * rate.rate
            availableToSell += (amount - availableToSell)
            break;
        } else {
            availableToSell += rate.amount
            priceToSell += rate.rate * rate.amount
        }
    }

    let averagePrice = priceToSell / availableToSell
    let allPrice = ratesJson.reduce((acc, val) => acc + val.rate * val.amount, 0)
    let allCoin1 = ratesJson.reduce((acc, val) => acc + val.amount, 0)

    let json = {
        availableToBuy: availableToSell,
        averagePrice,
        allPrice,
        allCoin1,
        asks: ratesJson
    }

    let text = `Стакан ${coin1}_${coin2}${rate ? `, при минимальной цене ${rate} ${coin2}` : ""} ${minutesBack ? formatDistance(new Date(), new Date(data.update), {locale: ru}) + " назад" : ""}: <br/>` +
        `<br /> Всего в стакане ${allCoin1} ${coin1} на ${allPrice} ${coin2}` +
        `<br />${amount ? `Можно продать ${availableToSell} ${coin1} за ${priceToSell} ${coin2}, при средней цене ${averagePrice} ${coin2}<br />` : ``}` +
        `<br />${ratesMsg}<br/><br />`


    return {text, json}
}

const getBuyInfo = async (params) => {
    let {coin2, coin1, rate, amount, minutesBack} = params

    const data = minutesBack ? state.pairs[`${coin1}${coin2}`].history[minutesBack - 1] : await binance.getStack(coin1, coin2)
    let asks = rate ? data.asks.filter(e => (+e[0] <= +rate)) : data.asks

    let ratesJson = asks.map(e => ({amount: +e[1], rate: +e[0]}))
    let ratesMsg = asks.map(e => `${e[1]} ${coin1} по ${e[0]} ${coin2}`).join("<br />")

    let availableToBuy = 0
    let priceToBuy = 0

    for (let rate of ratesJson) {
        if (priceToBuy + (rate.amount * rate.rate) >= amount) {
            const diff = amount - priceToBuy
            priceToBuy += diff

            availableToBuy += diff / rate.rate
            break;
        } else {
            priceToBuy += rate.amount * rate.rate
            availableToBuy += rate.amount
        }
    }

    let averagePrice = priceToBuy / availableToBuy
    let allPrice = ratesJson.reduce((acc, val) => acc + val.rate * val.amount, 0)
    let allCoin1 = ratesJson.reduce((acc, val) => acc + val.amount, 0)

    let json = {
        availableToBuy: availableToBuy,
        averagePrice,
        allPrice,
        allCoin1,
        asks: ratesJson
    }

    let text = `Стакан ${coin1}_${coin2}${rate ? `, при максимальной цене ${rate} ${coin2}` : ""} ${minutesBack ? formatDistance(new Date(), new Date(data.update), {locale: ru}) + " назад" : ""}:<br/>` +
        `<br /> Всего в стакане ${allCoin1} ${coin1} на ${allPrice} ${coin2}` +
        `<br />${amount ? `Можно купить ${availableToBuy} ${coin1} за ${priceToBuy} ${coin2}, при средней цене ${averagePrice} ${coin2}<br />` : ``}` +
        `<br />${ratesMsg}<br/><br />`


    return {text, json}
}

const buy = async (req, res) => {
    try {
        let {ticker, amount, percentage} = req.query

        if (!percentage) percentage = 5

        const {json: previousInfo} = await getBuyInfo({coin1: ticker, coin2: "USDT", amount: amount, minutesBack: 1})
        const {json: infoNow} = await getBuyInfo({coin1: ticker, coin2: "USDT", amount: amount})

        const previousPrice = previousInfo.averagePrice
        const priceNow = infoNow.averagePrice

        const priceToCompare = previousPrice + previousPrice / 100 * percentage

        if (priceNow < priceToCompare) {
            const data = await binance.buy(ticker, infoNow.availableToBuy, priceNow + priceNow / 100 * percentage)
            res.send(data)
        } else {
            throw (`Средняя цена на покупку ${infoNow.availableToBuy} ${ticker} за ${amount} USDT (${infoNow.averagePrice}) ` +
                `сейчас отличается от<br/> средней цены на покупку ` +
                `${previousInfo.availableToBuy} ${ticker} за ${amount} USDT 1 минуту назад (${previousInfo.averagePrice}) ` +
                `на больше чем ${percentage}%. ` +
                `Покупка отменена.`
            )
        }


    } catch (e) {
        console.error(e)
        res.status(500)
        res.send(e.stack || e)
    }
}

export {launchApp}