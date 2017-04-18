const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../../app');
const MongoClient = require('mongodb').MongoClient;
const sinon = require('sinon');
require('sinon-as-promised');

const authentication = require('../../../libs/authentication');

describe('Replies Test', function() {

    let db = undefined;
    before(function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });


    describe('Post : /experiences/:id/replies', function() {
        let experience_id = undefined;
        let sandbox;

        before('Create test data', function() {

            sandbox = sinon.sandbox.create();
            sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, 'fakeaccesstoken')
                .resolves({
                    id: '-1',
                    name: 'markLin',
                });
            return db.collection('experiences').insert({
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                status: "published",
            }).then(function(result) {
                experience_id = result.ops[0]._id.toString();
            });
        });

        it('Success, and expected return data', function() {
            return request(app)
                .post('/experiences/' + experience_id + '/replies')
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'reply');
                    assert.deepProperty(res.body, 'reply.id');
                    assert.deepProperty(res.body, 'reply.content');
                    assert.deepProperty(res.body, 'reply.like_count');
                    assert.deepProperty(res.body, 'reply.floor');
                });
        });

        it('Fail, and expected return experiencedId does not exit', function() {
            return request(app)
                .post('/experiences/1111/replies')
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(404);
        });
        after(function() {
            let pro1 = db.collection('replies').remove({});
            let pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });

        after(function() {
            sandbox.restore();
        });
    });

    describe('Get : /experiences/:id/replies', function() {
        let experience_id = undefined;

        before('Create test data', function() {
            return db.collection('experiences').insert({
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                status: "published",
            }).then(function(result) {
                experience_id = result.ops[0]._id;
                return db.collection('replies').insertMany([{
                    experience_id: experience_id,
                    author: {
                        id: "003",
                    },
                    content: "hello test0",
                }, {
                    experience_id: experience_id,
                    author: {
                        id: "002",
                    },
                    content: "hello test1",
                }, {
                    experience_id: experience_id,
                    author: {
                        id: "003",
                    },
                    content: "hello test2",
                }]);
            });
        });

        it('Get experiences replies data and expect 3 replies ', function() {
            return request(app)
                .get('/experiences/' + experience_id + '/replies')
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, 3);
                });
        });

        it('Set error replies and expect error code 404', function() {
            return request(app)
                .get('/experiences/1111/replies')
                .expect(404);
        });
        after(function() {
            let pro1 = db.collection('replies').remove({});
            let pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });

    });
});
