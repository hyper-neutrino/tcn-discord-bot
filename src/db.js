import { MongoClient } from "mongodb";
import config from "./config.js";

export const db_client = new MongoClient(config.mongo_uri);
export const db = db_client.db();
