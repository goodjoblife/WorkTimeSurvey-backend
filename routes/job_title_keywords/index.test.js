const { assert } = require('chai');
const request = require('supertest');
const { MongoClient } = require('mongodb');
const config = require('config');

const app = require('../../app');
const create_capped_collection = require('../../database/migrations/create-jobTitleKeywords-collection');

describe('job_title_keywords', () => {
    let db;

    before(() =>
        MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
            db = _db;
        })
    );

    describe('company', () => {
        before(() => db.collection('job_title_keywords').insertMany([
            { word: 'GoodJob' },
            { word: 'GoodJob' },
            { word: 'GoodJob' },
            { word: 'GoodJob2' },
            { word: 'GoodJob2' },
            { word: 'GoodJob3' },
        ]));

        it('will return keywords in order', () =>
            request(app)
            .get('/job_title_keywords')
            .query({ num: '2' })
            .expect(200)
            .expect((res) => {
                assert.isArray(res.body.keywords);
                assert.equal(res.body.keywords.length, 2);
                assert.equal(res.body.keywords[0], 'GoodJob');
                assert.equal(res.body.keywords[1], 'GoodJob2');
            }));

        it('number should be 1~20', () =>
            request(app)
            .get('/job_title_keywords')
            .query({ num: '0' })
            .expect(422));

        it('number should be 1~20', () =>
            request(app)
            .get('/job_title_keywords')
            .query({ num: '100' })
            .expect(422));

        it('num should be integer number', () =>
            request(app)
            .get('/job_title_keywords')
            .query({ num: '10.5' })
            .expect(422));

        after(() =>
            db.collection('job_title_keywords')
            .drop()
            .then(() => create_capped_collection(db)));
    });
});
