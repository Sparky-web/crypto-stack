import express from "express";
import binance from "./binance.js";

const buy = (rate, amount, asks) => {

}

const launchApp = async () => {
    const app = express()

    app.get("/", async (req, res) => {
        try {
            let {coin2, coin1, rate, amount, output, type} = req.query

            if(!(coin1 && coin2)) throw new Error("Нужно передать как минимум coin1 и coin2 параметры")

            type = type === "buy" ? "asks" : "bids"

            const data = await binance.getStack(coin1, coin2)
            let asks = rate ? data[type].filter(e => e[0] <= rate) : data[type]

            let ratesJson = asks.map(e => ({amount: +e[1], rate: +e[0]}))
            let ratesMsg = asks.map(e => `${e[1]} ${coin1} по ${e[0]} ${coin2}`).join("<br />")

            let availableToBuy = 0
            let priceToBuy = 0

            for (let rate of ratesJson) {
                if (rate.amount + availableToBuy >= amount) {
                    priceToBuy += (amount - availableToBuy) * rate.rate
                    availableToBuy += (amount - availableToBuy)
                    break;
                } else {
                    availableToBuy += rate.amount
                    priceToBuy += rate.rate * rate.amount
                }
            }

            let averagePrice = priceToBuy / availableToBuy
            let allPrice = ratesJson.reduce((acc, val) => acc + val.rate * val.amount, 0)
            let allCoin1 = ratesJson.reduce((acc, val) => acc + val.amount, 0)

            let json = {
                availableToBuy,
                averagePrice,
                allPrice,
                allCoin1,
                asks: ratesJson
            }

            let text = `Стакан ${coin1}_${coin2}${rate ? `, при максимальной цене ${rate} ${coin2}` : ""}:<br/>` +
                `<br /> Всего в стакане ${allCoin1} ${coin1} на ${allPrice} ${coin2}` +
                `<br />${amount ? `Можно ${type === "asks" ? "купить" : "продать"} ${availableToBuy} ${coin1} за ${priceToBuy} ${coin2}, при средней цене ${averagePrice} ${coin2}<br />` : ``}` +
                `<br />${ratesMsg}<br/><br />`

            res.send(output === "text" ? text : json)
        } catch (e) {
            console.error(e)
            res.status(500)
            res.send(e.stack || e)
        }
    })

    await app.listen(process.env.PORT)

    return app
}

export {launchApp}