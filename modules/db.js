import filesystem from "./filesystem.js"
import lodash from "lodash"
import {JSONFile, Low} from 'lowdb'

import path, {dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createDbIfNotExists() {
    filesystem.createFileIfNotExists(".tmp/db.json",
        `{"pairs": []}`
    )
}

async function getDb() {
    createDbIfNotExists()

    const adapter = new JSONFile(path.join(__dirname, "../.tmp/db.json"))
    const db = new Low(adapter)
    await db.read()

    db.chain = lodash.chain(db.data)

    return db
}

async function initialize() {
    database.db = await getDb()
    database.db.chain = lodash.chain(database.db.data)
}

const getPairs = () => {
    return database.db.data.pairs
}
const addPairs = async (pairs) => {
    for (const pair of pairs) {
        database.db.data.pairs.push(pair)
    }
    await database.db.write()
}

const updateHistory = async (pair, data) => {
    database.db.data.history[pair].unshift({
        ...data,
        timestamp: Date.now()
    })
    if(database.db.data.history[pair].length > 10) database.db.data.history[pair].pop()

    await database.db.write()
}

const getHistory = (pair, minutesBack) => {
    return database.db.data.history[pair][minutesBack - 1]
}

export const database = {initialize, getPairs, addPairs, updateHistory, getHistory}
export default database