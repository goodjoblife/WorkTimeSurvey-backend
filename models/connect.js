const config = require("config");
const { MongoClient } = require("mongodb");

async function connectMongo() {
    const client = await MongoClient.connect(config.get("MONGODB_URI"));
    const db = await client.db(config.get("MONGODB_DBNAME"));

    return { client, db };
}

module.exports = { connectMongo };
