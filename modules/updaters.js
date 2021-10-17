//depends on database and binance modules
import binance from "./binance.js";
import database from "./db.js";
import state from "./state.js"
import _ from "lodash"

import pkg from 'fast-sort'
const {sort} = pkg

const addNewPairs = async () => {
    const allPairs = await binance.getUSDTPairs()
    const existingPairs = await database.getPairs()
    const newPairs = allPairs.filter(el => !existingPairs.find(e => e === el))

    await database.addPairs(newPairs)
    return newPairs
}

const startUpdatingPairs = async () => {
    let pairs = database.getPairs()
    const chunks = _.chunk(pairs, 10)
    state.pairs = {}

    binance.wsClient.on('formattedMessage', binanceMessageHandler)
    for (let chunk of chunks) {
        await Promise.all(chunk.map(subscribePair))
        await new Promise(r => setTimeout(r, 1000))
    }
}

const binanceMessageHandler = (data) => {
    const symbol = state.pairs[data.symbol]
    if (!symbol) return;

    updateBidsAndAsks(data)
}

const subscribePair = async (pair) => {
    binance.wsClient.subscribeDiffBookDepth(pair, 1000, "spot")
    await new Promise(r => setTimeout(r, 1000))

    state.pairs[pair] = {
        ...await binance.getStackByFullSymbol(pair),
        history: []
    }
}

const updateBidsAndAsks = (data) => {
    let symbol = state.pairs[data.symbol]

    for (let bid of data.bidDepthDelta) {
        const i = symbol.bids.findIndex(e => e[0] === bid.price)
        const item = symbol.bids[i]

        if (item) symbol.bids.splice(i, 1, [bid.price, bid.quantity])
        else symbol.bids.push([bid.price, bid.quantity])
    }

    for (let ask of data.askDepthDelta) {
        const i = symbol.asks.findIndex(e => e[0] === ask.price)
        const item = symbol.asks[i]

        if (item) symbol.asks.splice(i, 1, [ask.price, ask.quantity])
        else symbol.asks.push([ask.price, ask.quantity])
    }

    symbol.asks = sort(symbol.asks).asc(e => e[0]).filter(e => e[1] > 0).slice(0, 250)
    symbol.bids = sort(symbol.bids).desc(e => e[0]).filter(e => e[1] > 0).slice(0, 250)

    symbol.lastUpdate = Date.now()

    state.pairs[data.symbol] = symbol
}

const startAddingNewPairs = async () => {
    setInterval(async () => {
        try {
            const newPairs = await addNewPairs()
            for (let pair of newPairs) {
                await subscribePair(pair)
            }
        } catch (e) {
            console.error(e)
        }
    }, 60 * 60 * 1000)
}

const startWritingHistory = () => {
    setInterval(async () => {
        const pairs = Object.keys(state.pairs)

        for(let pair of pairs) {
            const history = {
                asks: state.pairs[pair].asks.slice(0, 100),
                bids: state.pairs[pair].bids.slice(0, 100),
                update: state.pairs[pair].lastUpdate
            }

            state.pairs[pair].history.unshift(history)
            if(state.pairs[pair].history.length > 10) state.pairs[pair].history.pop()
        }
    }, 60000)
}

const startUpdatingTruthSource = () => {
    setInterval(async () => {
        let pairs = database.getPairs()
        const chunks = _.chunk(pairs, 10)

        for(let chunk of chunks) {
            await Promise.all(chunk.map(async pair => {
                const data = await binance.getStackByFullSymbol(pair)
                state.pairs[pair].asks = data.asks
                state.pairs[pair].bids = data.bids
            }))
        }
    }, 60 * 60 * 1000)
}

export const updaters = {addNewPairs, startUpdatingPairs, startAddingNewPairs, startWritingHistory, startUpdatingTruthSource}
export default updaters