const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../../app');
const { MongoClient, ObjectId } = require('mongodb');
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');

const authentication = require('../../../libs/authentication');

describe('Replies Test', function() {
    let db;
    let fake_user = {
        _id: new ObjectId(),
        facebook_id: '-1',
        facebook: {
            id: '-1',
            name: 'markLin',
        },
    };

    before('DB: Setup', function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    describe('POST /experiences/:id/replies', function() {
        let experience_id_string;
        let sandbox;

        beforeEach('Stub', function() {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');

            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'wrongToken')
                .rejects();
        });

        beforeEach('Seed experiences collection', function() {
            const experience = {
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                reply_count: 0,
            };
            return db.collection('experiences').insertOne(experience)
                .then((result) => {
                    experience_id_string = result.insertedId.toString();
                });
        });

        it('should 200 Success if succeed', function() {
            const req = request(app)
                .post(`/experiences/${experience_id_string}/replies`)
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
                    assert.deepPropertyVal(res.body, 'reply.experience_id', experience_id_string);
                    assert.deepPropertyVal(res.body, 'reply.like_count', 0);
                    assert.deepEqual(res.body.reply.author, {id: '-1', type: 'facebook'});
                    assert.deepProperty(res.body, 'reply.created_at');
                });

            const check_experiences_collection = req
                .then(() =>
                    db.collection('experiences').findOne({_id: ObjectId(experience_id_string)})
                        .then(experience => {
                            assert.equal(experience.reply_count, 1);
                        }));

            const check_replies_collection = req
                .then(res =>
                    db.collection('replies').findOne({_id: ObjectId(res.body.reply._id)})
                        .then(reply => {
                            assert.equal(reply.content, '你好我是大留言');
                            assert.equal(reply.floor, 0);
                            assert.deepEqual(reply.experience_id, ObjectId(experience_id_string));
                            assert.deepPropertyVal(res.body, 'reply.like_count', 0);
                            assert.property(reply, 'created_at');
                            assert.deepEqual(reply.author, {id: '-1', type: 'facebook'});
                        }));

            return Promise.all([
                check_experiences_collection,
                check_replies_collection,
            ]);
        });

        it('should 401 Unauthorized if user is not valid', function() {
            return request(app)
                .post(`/experiences/${experience_id_string}/replies`)
                .send({
                    access_token: 'wrongToken',
                    content: "你好我是大留言",
                })
                .expect(401);
        });

        it('should 404 NotFound if target experience does not exist', function() {
            return request(app)
                .post('/experiences/1111/replies')
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(404);
        });

        it('should fail, content is required', function() {
            return request(app)
                .post(`/experiences/${experience_id_string}/replies`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(422);
        });

        afterEach(function() {
            let pro1 = db.collection('replies').deleteMany({});
            let pro2 = db.collection('experiences').deleteMany({});
            return Promise.all([pro1, pro2]);
        });

        afterEach(function() {
            sandbox.restore();
        });
    });

    describe('Get : /experiences/:id/replies', function() {
        let experience_id;
        let experience_id_string;
        let sandbox = null;
        const test_Replies_Count = 200;

        before('create user', function() {
            sandbox = sinon.sandbox.create();
            sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
        });

        before('create test data', function() {
            return db.collection('experiences').insertOne({
                type: 'interview',
                author: {
                    id: fake_user.facebook_id,
                    type: 'facebook',
                },
                status: "published",
            }).then(function(result) {
                experience_id = result.insertedId;
                experience_id_string = result.insertedId.toString();
                let testDatas = [];
                for (var i = 0; i < test_Replies_Count; i++) {
                    testDatas.push({
                        created_at: new Date(),
                        experience_id: experience_id,
                        author: {
                            id: fake_user.facebook_id,
                            type: 'facebook',
                        },
                        content: "hello test0",
                        like_count: 0,
                        report_count: 0,
                        floor: i+1,
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
                    reply_id: reply2._id,
                    experience_id: reply2.experience_id,
                }];
                return db.collection('reply_likes').insertMany(testLikes);
            });
        });

        it('get experiences replies data and expect 200 replies ', function() {
            return request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    limit: 200,
                })
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'replies.0.author');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, test_Replies_Count);
                });
        });

        it('get experiences reply, and expected liked is true ', function() {
            return request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    limit: 200,
                    start: 0,
                })
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author');
                    assert.isArray(res.body.replies);
                    const replies = res.body.replies;
                    const target_reply = replies.find((reply) => {
                        return reply.liked == true;
                    });
                    assert.isTrue(target_reply.liked);
                });
        });

        it('get experiences replies data by start 0 and limit 100 , expect 100 replies ', function() {
            return request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    limit: 100,
                    start: 0,
                })
                .send({
                    access_token: 'fakeaccesstoken',
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
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(404);
        });

        it('limit = 2000  and expect error code 402', function() {
            return request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .query({
                    limit: 2000,
                })
                .expect(422);
        });

        it('get one experiences replies , and validate return field', function() {
            return request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    limit: 1,
                    start: 0,
                })
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body.replies[0], 'author');

                    assert.deepProperty(res.body.replies[0], '_id');
                    assert.deepProperty(res.body.replies[0], 'content');
                    assert.deepProperty(res.body.replies[0], 'like_count');
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

        after(function() {
            sandbox.restore();
        });
    });
});
