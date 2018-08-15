const config = require("config");
const { MongoClient } = require("mongodb");

async function connectMongo() {
    const db = await MongoClient.connect(config.get("MONGODB_URI"));

    return { db };
}

module.exports = { connectMongo };
