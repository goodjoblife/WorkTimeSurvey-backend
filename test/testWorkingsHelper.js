const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const config = require('config');
const HttpError = require('../libs/errors').HttpError;
const helper = require('../routes/workings_helper');

describe('Workings Helper', function() {
    describe('normalizeCompany', function() {
        let db = undefined;

        before('DB: Setup', function() {
            return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
                db = _db;
            });
        });

        before('Seed companies', function() {
            return db.collection('companies').insertMany([
                {
                    id: '00000001',
                    name: 'GOODJOB',
                },
                {
                    id: '00000002',
                    name: 'GOODJOBGREAT',
                },
                {
                    id: '00000003',
                    name: 'GOODJOBGREAT',
                },
            ]);
        });

        it('只給 company_id', function() {
            return assert.becomes(helper.normalizeCompany(db, '00000001'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('禁止錯誤的 company_id', function() {
            return assert.isRejected(helper.normalizeCompany(db, '00000000'));
        });

        it('只給 company query', function() {
            return assert.becomes(helper.normalizeCompany(db, undefined, 'GOODJOB'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('當 company 是小寫時，轉換成大寫', function() {
            return assert.becomes(helper.normalizeCompany(db, undefined, 'GoodJob'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('只給 company，但名稱無法決定唯一公司', function() {
            return assert.becomes(helper.normalizeCompany(db, undefined, 'GoodJobGreat'), {
                name: 'GOODJOBGREAT',
            });
        });

        after('DB: 清除 companies', function() {
            return db.collection('companies').remove({});
        });
    });

    describe('checkAndUpdateQuota', function() {
        let db;

        before('MongoDB: Setup', function() {
            return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
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
