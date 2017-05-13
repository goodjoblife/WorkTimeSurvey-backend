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
        let experience_id = undefined;
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
                        create_at: new Date(),
                        experience_id: experience_id,
                        author: {
                            id: "man" + i,
                        },
                        content: "hello test0",
                    });
                }
                return db.collection('replies').insertMany(testDatas);
            });
        });

        it('Get experiences replies data and expect 200 replies ', function() {
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

        it('Get experiences replies data by start 0 and limit 10 , expect 10 replies ', function() {
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
