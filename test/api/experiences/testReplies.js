const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../../app');
const { MongoClient, ObjectId } = require('mongodb');
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');

const authentication = require('../../../libs/authentication');

describe('Replies Test', function() {

    let db = undefined;

    before(function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    describe('Post /experiences/:id/replies', function() {
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

            return db.collection('experiences').insertOne({
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                reply_count: 0,
            }).then(function(result) {
                experience_id = result.insertedId.toString();
            });
        });

        it('post a normal experience reply, and expected return data', function() {
            return request(app)
                .post('/experiences/' + experience_id + '/replies')
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'reply');
                    assert.deepProperty(res.body, 'reply._id');
                    assert.deepPropertyVal(res.body, 'reply.content', '你好我是大留言');
                    assert.deepPropertyVal(res.body, 'reply.floor', 0);
                    assert.deepPropertyVal(res.body, 'reply.experience_id', experience_id);
                    assert.deepPropertyVal(res.body, 'reply.like_count', 0);
                    assert.deepEqual(res.body.reply.user, {id: '-1', type: 'facebook'});

                    return ObjectId(res.body.reply._id);
                })
                .expect(() => {
                    // experience part
                    return db.collection('experiences').findOne({_id: ObjectId(experience_id)})
                        .then(experience => {
                            assert.equal(experience.reply_count, 1);
                        });
                })
                .expect(res => {
                    // reply part
                    return db.collection('replies').findOne({_id: res.body.reply._id})
                        .then(reply => {
                            assert.deepEqual(reply.experience_id, ObjectId(experience_id));
                            assert.deepEqual(reply.user, {id: '-1', type: 'facebook'});
                        });
                });
        });

        it('post a error experience_id reply, and expected return experiencedId does not exit', function() {
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
        let experience_id = null;
        const test_Replies_Count = 200;

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
                let testDatas = [];
                for (var i = 0; i < test_Replies_Count; i++) {
                    testDatas.push({
                        created_at: new Date(),
                        experience_id: experience_id,
                        author: {
                            id: "man" + i,
                        },
                        content: "hello test0",
                        like_count: 0,
                        report_count: 0,
                        floor: 1,
                    });
                }
                return db.collection('replies').insertMany(testDatas);
            }).then(function(result) {
                let reply1 = result.ops[0];
                let reply2 = result.ops[1];
                let testLikes = [{
                    user: reply1.author,
                    reply_id: reply1._id,
                    experience_id: reply1.experience_id,
                }, {
                    user: reply2.author,
                    reply_id: reply1._id,
                    experience_id: reply1.experience_id,
                }, {
                    user: reply1.author,
                    reply_id: reply2._id,
                    experience_id: reply2.experience_id,
                }];
                return db.collection('reply_likes').insertMany(testLikes);
            });
        });

        it('get experiences replies data and expect 200 replies ', function() {
            return request(app)
                .get('/experiences/' + experience_id + '/replies')
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, test_Replies_Count);
                });
        });

        it('get experiences replies, and check replies liked field expect two reply is liked  ', function() {
            return request(app)
                .get('/experiences/' + experience_id + '/replies')
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author');
                    assert.isArray(res.body.replies);
                    let reply = res.body.replies[0];
                    assert.isTrue(reply.liked);
                });
        });

        it('get experiences replies data by start 0 and limit 100 , expect 10 replies ', function() {
            return request(app)
                .get('/experiences/' + experience_id + '/replies')
                .query({
                    limit: 100,
                    start: 0,
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, 100);
                });
        });

        it('set error replies and expect error code 404', function() {
            return request(app)
                .get('/experiences/1111/replies')
                .expect(404);
        });

        it('get one experiences replies , and validate return field', function() {
            return request(app)
                .get('/experiences/' + experience_id + '/replies')
                .query({
                    limit: 1,
                    start: 0,
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body.replies[0], 'author');

                    assert.deepProperty(res.body.replies[0], '_id');
                    assert.deepProperty(res.body.replies[0], 'content');
                    assert.deepProperty(res.body.replies[0], 'like_count');
                    assert.deepProperty(res.body.replies[0], 'report_count');
                    assert.deepProperty(res.body.replies[0], 'liked');
                    assert.deepProperty(res.body.replies[0], 'created_at');
                    assert.deepProperty(res.body.replies[0], 'floor');

                });
        });

        after(function() {
            let pro1 = db.collection('replies').remove({});
            let pro2 = db.collection('experiences').remove({});
            let pro3 = db.collection('reply_likes').remove({});
            return Promise.all([pro1, pro2, pro3]);
        });

    });
});
