const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const config = require('config');

const recommendation = require('../libs/recommendation');

describe('Recommendation Library', function() {
    describe('getRecommendationString', function() {
        let db;

        before(function() {
            return MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
                db = _db;
            });
        });

        before(function() {
            return db.collection('recommendations').insertMany([
                {
                    _id: new ObjectId('00000000ccd8958909a983e9'),
                    user: {
                        id: '-1',
                        type: 'facebook',
                    },
                },
            ]);
        });

        it('resolve with correct _id', function() {
            const user = {
                id: '-1',
                type: 'facebook',
            };

            return assert.becomes(recommendation.getRecommendationString(db, user), '00000000ccd8958909a983e9');
        });

        it('resolve with new recommendation string', function() {
            const user = {
                id: 'mark',
                type: 'facebook',
            };

            const main = recommendation.getRecommendationString(db, user);

            return Promise.all([
                assert.isFulfilled(main),
                // 尋找 DB 中的 user _id 與回傳的相符
                main.then(() => db.collection('recommendations').findOne({user: user})).then(result => {
                    return assert.becomes(main, result._id.toHexString());
                }),
            ]);
        });

        it('will return the same recommendation string', function() {
            const user = {id: 'mark', type: 'facebook'};

            const main1 = recommendation.getRecommendationString(db, user);
            const main2 = recommendation.getRecommendationString(db, user);

            return Promise.all([main1, main2]).then(([rec1, rec2]) => {
                assert.equal(rec1, rec2);
            });
        });

        after(function() {
            return db.collection('recommendations').remove({});
        });
    });

    describe('getUserByRecommendationString', function() {
        let db;

        before(function() {
            return MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
                db = _db;
            });
        });

        before(function() {
            return db.collection('recommendations').insertMany([
                {
                    _id: new ObjectId('00000000ccd8958909a983e9'),
                    user: {
                        id: '-1',
                        type: 'facebook',
                    },
                },
            ]);
        });

        it('resolve with correct user', function() {
            return assert.becomes(recommendation.getUserByRecommendationString(db, '00000000ccd8958909a983e9'), {id: '-1', type: 'facebook'});
        });

        it('resolve with null', function() {
            return assert.becomes(recommendation.getUserByRecommendationString(db, '00000000ccd8958909a983ea'), null);
        });

        it('reject if format error', function() {
            return Promise.all([
                // should be a string
                assert.isRejected(recommendation.getUserByRecommendationString(db, 1234)),
                // should be a single String of 12 bytes or a string of 24 hex characters
                assert.isRejected(recommendation.getUserByRecommendationString(db, '0000')),
            ]);
        });

        after(function() {
            return db.collection('recommendations').remove({});
        });
    });
});
