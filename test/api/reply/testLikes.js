const assert = require('chai').assert;
const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');
const app = require('../../../app');
const authentication = require('../../../libs/authentication');

describe('POST /replies/:id/likes', function() {
    let db;
    let fake_user = {
        _id: new ObjectId(),
        facebook_id: '1',
        facebook: {id: '1', name: 'markLin'},
    };
    let fake_other_user = {
        _id: new ObjectId(),
        facebook_id: '2',
        facebook: {id: '2', name: 'Mark Chen'},
    };
    let reply_id_string;
    const experience_id = new ObjectId();
    let sandbox;

    before('DB: Setup', function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    beforeEach('Seed reply', function() {
        const reply = {
            experience_id,
            content: 'Hello',
            user: {
                id: "3",
                type: "facebook",
            },
            floor: 2,
            like_count: 0,
        };

        return db.collection('replies').insertOne(reply)
            .then(result => {
                reply_id_string = result.insertedId.toString();
            });
    });

    beforeEach('Mock', function() {
        sandbox = sinon.sandbox.create();
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'fakeAccessToken')
            .resolves(fake_user);
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'otherFakeAccessToken')
            .resolves(fake_other_user);
    });

    it('it should 404 Not Found if reply not exists', function() {
        return request(app)
            .post(`/replies/1234567890aa/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(404);
    });

    it('it should 200 success if succeed', function() {
        const req = request(app)
            .post(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .expect(function(res) {
                assert.deepEqual(res.body, {'success': true});
            });

        const check_reply_likes_collection = req
            .then(() => db.collection('reply_likes').findOne({
                reply_id: new ObjectId(reply_id_string),
                user: {
                    id: '1',
                    type: 'facebook',
                },
            }))
            .then(record => {
                assert.isNotNull(record, 'expect record is retrieved in db');
                assert.deepEqual(record.reply_id, new ObjectId(reply_id_string));
                assert.deepEqual(record.experience_id, experience_id);
            });

        const check_replies_collection = req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then(reply => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 1);
            });

        return Promise.all([
            check_reply_likes_collection,
            check_replies_collection,
        ]);
    });


    it('it should 200 success if other user like the same reply', function() {
        const req = request(app)
            .post(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .then(() => request(app)
                .post(`/replies/${reply_id_string}/likes`)
                .send({
                    access_token: 'otherFakeAccessToken',
                })
                .expect(200)
            );

        const check = req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then(reply => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 2);
            });

        return check;
    });

    it('it should 403 Forbidden if like again', function() {
        const req = request(app)
            .post(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .expect(function(res) {
                assert.deepEqual(res.body, {'success': true});
            });

        const other_req = req.then(() =>
            request(app)
                .post(`/replies/${reply_id_string}/likes`)
                .send({
                    access_token: 'fakeAccessToken',
                })
                .expect(403));

        const check_replies_collection = other_req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then(reply => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 1, 'like_count is still 1');
            });

        return check_replies_collection;
    });

    afterEach(function() {
        sandbox.restore();
    });

    afterEach(function() {
        return db.collection('replies').deleteMany({});
    });

    afterEach(function() {
        return db.collection('reply_likes').deleteMany({});
    });
});
