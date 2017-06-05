const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const helper = require('../../routes/company_helper');

describe('company Helper', function() {
    describe('Get company by Id or query', function() {
        let db = undefined;

        before('DB: Setup', function() {
            return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
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
                {
                    id: '00000004',
                    name: ['GOODJOBMARK', '馬克的公司'],
                },
                {
                    id: '00000005',
                    name: [['GOODJOBMARK', '馬克的公司'], ['GOOBJOBMARK', 'Mark Co']],
                },

            ]);
        });

        it('只給 company_id', function() {
            return assert.becomes(helper.getCompanyByIdOrQuery(db, '00000001'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('禁止錯誤的 company_id', function() {
            return assert.isRejected(helper.getCompanyByIdOrQuery(db, '00000000'));
        });

        it('只給 company query', function() {
            return assert.becomes(helper.getCompanyByIdOrQuery(db, undefined, 'GOODJOB'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('當 company 是小寫時，轉換成大寫', function() {
            return assert.becomes(helper.getCompanyByIdOrQuery(db, undefined, 'GoodJob'), {
                id: '00000001',
                name: 'GOODJOB',
            });
        });

        it('只給 company，但名稱無法決定唯一公司', function() {
            return assert.becomes(helper.getCompanyByIdOrQuery(db, undefined, 'GoodJobGreat'), {
                name: 'GOODJOBGREAT',
            });
        });

        it('取得公司名稱時，如果是陣列，則取出第一個字串', function() {
            return assert.becomes(helper.getCompanyByIdOrQuery(db, '00000004'), {
                id: '00000004',
                name: 'GOODJOBMARK',
            });
        });

        it('取得公司名稱時，如果是多重陣列，則取出第一個陣列的第一個字串', function() {
            return assert.becomes(helper.getCompanyByIdOrQuery(db, '00000005'), {
                id: '00000005',
                name: 'GOODJOBMARK',
            });
        });

        after('DB: 清除 companies', function() {
            return db.collection('companies').remove({});
        });
    });

});

