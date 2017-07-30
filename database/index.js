const MongoClient = require('mongodb').MongoClient;
const migrations = require('./migrations');
const config = require('config');

const collection_name = 'migrations';

async function isMigrated(db, name) {
    return !!await db.collection(collection_name).findOne({ _id: name });
}

function recordMigration(db, name) {
    return db.collection(collection_name).insertOne({
        _id: name,
        created_at: new Date(),
    });
}

async function migrate(db, name) {
    const result = await isMigrated(db, name);
    if (result === false) {
        // eslint-disable-next-line
        const migration = require(`./migrations/${name}`);

        await migration(db);
        await recordMigration(db, name);

        console.log(`${name} is migrating, done`);
    } else {
        console.log(`${name} is migrated, skipped`);
    }
}

const main = async function () {
    const db = await MongoClient.connect(config.get('MONGODB_URI'));

    try {
        await Promise.all(migrations.map(name => migrate(db, name)));
    } catch (err) {
        console.log(err);
    }

    try {
        await db.close();
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    main,
};
