const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;
const config = require('config');

describe('companies', function() {
    var db = undefined;

    before(function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    describe('search', function() {
        before(function() {
            return db.collection('companies').insertMany([
                {
                    id: '00000001',
                    name: 'MARK CHEN',
                    capital: 1000,
                },
                {
                    id: '00000002',
                    name: 'CHEN MARK',
                    capital: 2000,
                },
                {
                    id: '00000003',
                    name: 'MARK86092',
                    capital: 2000,
                },
                {
                    id: '00000004',
                    name: '公司好工作',
                    capital: 2500,
                },
                {
                    id: '00000005',
                    name: '公司好薪情',
                    capital: 3000,
                },
            ]);
        });

        it('包含兩個欄位：id, name', function() {
            return request(app)
                .get('/companies/search')
                .query({key: 'MARK'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, '0.id');
                    assert.deepProperty(res.body, '0.name');
                });
        });

        it('搜尋 `MARK`', function() {
            return request(app)
                .get('/companies/search')
                .query({key: 'MARK'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                });
        });

        it('搜尋 `公司`', function() {
            return request(app)
                .get('/companies/search')
                .query({key: '公司'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                });
        });

        it('搜尋 id `00000004`', function() {
            return request(app)
                .get('/companies/search')
                .query({key: '00000004'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.propertyVal(res.body[0], 'id', '00000004');
                    assert.propertyVal(res.body[0], 'name', '公司好工作');
                    assert.propertyVal(res.body[0], 'capital', 2500);
                });
        });

        it('搜尋小寫關鍵字 `mark`', function() {
            return request(app)
                .get('/companies/search')
                .query({key: 'mark'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                });
        });

        it('沒有關鍵字，要輸出錯誤', function() {
            return request(app)
                .get('/companies/search')
                .expect(422);
        });

        after(function() {
            return db.collection('companies').remove({});
        });
    });
});
