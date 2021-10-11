import dotenv from "dotenv";
dotenv.config()

import database from "./modules/db.js"
import state from "./modules/state.js";
import {launchApp} from "./modules/app.js";
import binance from "./modules/binance.js";

const db = await database.getDb()
state.db = db

console.log(await binance.getUSDTPairs())
launchApp()


