import filesystem from "./filesystem.js"
import lodash from "lodash"
import {JSONFile, Low} from 'lowdb'

import path, {dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createDbIfNotExists() {
    filesystem.createFileIfNotExists(".tmp/db.json",
        `{"history": {}}`
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

async function writeItemsIds(items, collection, db) {
    const ids = items.map((item) => item.idStr)
    db.data[collection].push(...ids)
    await db.write()

    return items
}

function removeExistingItemsById(items, collection, db) {
    return items.filter(item => !(db.data[collection].find(old => old === item.idStr)))
}

async function setLastUpdate(lastUpdate, db) {
    db.data.lastUpdate = {
        ...lastUpdate,
        date: Date.now(),
    }
    await db.write()
}

function getNewItems(items, collection, db, options = {
    param: null,
    paramDb: null
}) {
    if (options.param && options.paramDb)
        return items.filter(item => !(db.data[collection].find(dbItem => dbItem[options.paramDb] === item[options.param])))
    else if (options.param)
        return items.filter(item => !(db.data[collection].find(dbItem => dbItem === item[options.param])))
    else if (options.paramDb)
        return items.filter(item => !(db.data[collection].find(dbItem => dbItem[options.paramDb] === item)))
    else
        return items.filter(item => !(db.data[collection]).find(dbItem => dbItem === item))
}

async function writeItems(items, collection, db, options = {
    paramToWrite: null
}) {
    let newItems = items
    if(options.paramToWrite) newItems = items.map(item => item[options.paramToWrite])
    db.data[collection].push(...newItems)
    await db.write()
    return items
}

async function writeItem(item, collection, db) {
    db.data[collection] = item
    await db.write()
    return item
}

export default {getDb, writeItemsIds, removeExistingItemsById, setLastUpdate, getNewItems, writeItems, writeItem}