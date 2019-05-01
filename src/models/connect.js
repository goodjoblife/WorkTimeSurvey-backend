const { MongoClient } = require("mongodb");

const { MONGODB_URI, MONGODB_DBNAME } = process.env;

async function connectMongo() {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = await client.db(MONGODB_DBNAME);

    return { client, db };
}

module.exports = { connectMongo };
