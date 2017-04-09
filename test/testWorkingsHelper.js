const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const HttpError = require('../libs/errors').HttpError;
const helper = require('../routes/workings_helper');

describe('Workings Helper', function() {
    describe('checkAndUpdateQuota', function() {
        let db;

        before('MongoDB: Setup', function() {
            return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
                db = _db;
            });
        });

        before('Seeding', function() {
            return db.collection('authors').insertMany([
                {
                    _id: {
                        id: '001',
                        type: 'facebook',
                    },
                    queries_count: 4,
                },
                {
                    _id: {
                        id: '002',
                        type: 'facebook',
                    },
                    queries_count: 5,
                },
            ]);
        });

        it('fulfilled with queries_count if quota is OK', function() {
            return assert.becomes(helper.checkAndUpdateQuota(db, {id: '001', type: 'facebook'}), 5);
        });

        it('rejected with HttpError if quota is reached', function() {
            return assert.isRejected(helper.checkAndUpdateQuota(db, {id: '001', type: 'facebook'}), HttpError);
        });

        after(function() {
            return db.collection('authors').remove({});
        });
    });
});

