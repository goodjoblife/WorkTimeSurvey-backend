const co = require('co');
const MongoClient = require('mongodb').MongoClient;
const migrations = require('./migrations');
const config = require('config');
const collection_name = 'migrations';

function isMigrated(db, name) {
    return db.collection(collection_name).findOne({_id: name}).then(result => {
        if (result) {
            return true;
        } else {
            return false;
        }
    });
}

function recordMigration(db, name) {
    return db.collection(collection_name).insertOne({
        _id: name,
        created_at: new Date(),
    });
}

function migrate(db, name) {
    return co(function* () {
        const result = yield isMigrated(db, name);
        if (result === false) {
            const migration = require(`./migrations/${name}`);

            yield migration(db);
            yield recordMigration(db, name);

            console.log(`${name} is migrating, done`);
        } else {
            console.log(`${name} is migrated, skipped`);
        }
    });
}

const main = co.wrap(function* () {
    const db = yield MongoClient.connect(config.get('MONGODB_URI'));

    try {
        for (let name of migrations) {
            yield migrate(db, name);
        }
        yield db.close();
    } catch (err) {
        console.log(err);
        yield db.close();
    }
});

module.exports = {
    main,
};
