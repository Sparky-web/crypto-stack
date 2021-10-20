import dotenv from "dotenv";
dotenv.config()

import database from "./modules/db.js"
import state from "./modules/state.js";
import {launchApp} from "./modules/app.js";
import binance from "./modules/binance.js";
import updaters from "./modules/updaters.js";

await database.initialize()

console.log(await updaters.addNewPairs())

await updaters.startUpdatingPairs()
await updaters.startAddingNewPairs()
await updaters.startWritingHistory()
// await updaters.startUpdatingTruthSource()

console.log("up and running")

launchApp()


