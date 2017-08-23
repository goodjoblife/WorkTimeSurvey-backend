const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const config = require('config');
const HttpError = require('../libs/errors').HttpError;
const helper = require('./workings_helper');

describe('Workings Helper', () => {
    describe('checkAndUpdateQuota', () => {
        let db;

        before('MongoDB: Setup', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
            db = _db;
        }));

        before('Seeding', () => db.collection('users').insertMany([
            {
                facebook_id: '001',
                time_and_salary_count: 4,
            },
            {
                facebook_id: '002',
                time_and_salary_count: 5,
            },
        ]));

        it('fulfilled with queries_count if quota is OK', () => assert.becomes(helper.checkAndUpdateQuota(db, { id: '001', type: 'facebook' }), 5));

        it('rejected with HttpError if quota is reached', () => assert.isRejected(helper.checkAndUpdateQuota(db, { id: '001', type: 'facebook' }), HttpError));

        after(() => db.collection('users').remove({}));
    });
});
