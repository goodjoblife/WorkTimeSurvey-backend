const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../app');
const { MongoClient, ObjectId } = require('mongodb');
const sinon = require('sinon');
const config = require('config');

const authentication = require('../../libs/authentication');

describe('Replies Test', () => {
    let db;
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: '-1',
        facebook: {
            id: '-1',
            name: 'markLin',
        },
    };
    const fake_other_user = {
        _id: new ObjectId(),
        facebook_id: '-2',
        facebook: {
            id: '-2',
            name: 'markChen',
        },
    };

    before('DB: Setup', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    describe('POST /experiences/:id/replies', () => {
        let experience_id_string;
        let sandbox;

        beforeEach('Stub', () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');

            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'wrongToken')
                .rejects();
        });

        beforeEach('Seed experiences collection', () => {
            const experience = {
                type: 'interview',
                author_id: new ObjectId(),
                reply_count: 0,
            };
            return db.collection('experiences').insertOne(experience)
                .then((result) => {
                    experience_id_string = result.insertedId.toString();
                });
        });

        it('should 200 Success if succeed', () => {
            const req = request(app)
                .post(`/experiences/${experience_id_string}/replies`)
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'reply');
                    assert.deepProperty(res.body, 'reply._id');
                    assert.deepPropertyVal(res.body, 'reply.content', '你好我是大留言');
                    assert.deepPropertyVal(res.body, 'reply.floor', 0);
                    assert.deepPropertyVal(res.body, 'reply.experience_id', experience_id_string);
                    assert.deepPropertyVal(res.body, 'reply.like_count', 0);
                    assert.deepEqual(res.body.reply.author_id, fake_user._id.toString());
                    assert.deepProperty(res.body, 'reply.created_at');
                });

            const check_experiences_collection = req
                .then(() =>
                    db.collection('experiences').findOne({ _id: ObjectId(experience_id_string) })
                        .then((experience) => {
                            assert.equal(experience.reply_count, 1);
                        }));

            const check_replies_collection = req
                .then(res =>
                    db.collection('replies').findOne({ _id: ObjectId(res.body.reply._id) })
                        .then((reply) => {
                            assert.equal(reply.content, '你好我是大留言');
                            assert.equal(reply.floor, 0);
                            assert.deepEqual(reply.experience_id, ObjectId(experience_id_string));
                            assert.deepPropertyVal(res.body, 'reply.like_count', 0);
                            assert.property(reply, 'created_at');
                            assert.deepEqual(reply.author_id, fake_user._id);
                        }));

            return Promise.all([
                check_experiences_collection,
                check_replies_collection,
            ]);
        });

        it('should 401 Unauthorized if user is not valid', () => request(app)
                .post(`/experiences/${experience_id_string}/replies`)
                .send({
                    access_token: 'wrongToken',
                    content: "你好我是大留言",
                })
                .expect(401));

        it('should 404 NotFound if target experience does not exist', () => request(app)
                .post('/experiences/1111/replies')
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(404));

        it('should fail, content is required', () => request(app)
                .post(`/experiences/${experience_id_string}/replies`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(422));

        afterEach(() => {
            const pro1 = db.collection('replies').deleteMany({});
            const pro2 = db.collection('experiences').deleteMany({});
            return Promise.all([pro1, pro2]);
        });

        afterEach(() => {
            sandbox.restore();
        });
    });

    describe('GET /experiences/:id/replies', () => {
        let experience_id;
        let experience_id_string;
        let sandbox = null;
        const TEST_REPLIES_COUNT = 200;

        before('create user', () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'otherFakeAccessToken')
                .resolves(fake_other_user);
        });

        before('create test data', () => db.collection('experiences').insertOne({
            type: 'interview',
            author_id: fake_user._id,
        }).then((result) => {
            experience_id = result.insertedId;
            experience_id_string = result.insertedId.toString();

            const testDatas = [];
            for (let i = 0; i < TEST_REPLIES_COUNT; i += 1) {
                testDatas.push({
                    created_at: new Date(),
                    experience_id,
                    author_id: fake_user._id,
                    content: "hello test0",
                    like_count: 0,
                    report_count: 0,
                    floor: i,
                });
            }
            return db.collection('replies').insertMany(testDatas);
        }).then((result) => {
            const reply1 = result.ops[0];
            const reply2 = result.ops[1];
            const reply3 = result.ops[2];
            const testLikes = [{
                user_id: reply1.author_id,
                reply_id: reply1._id,
                experience_id: reply1.experience_id,
            }, {
                user_id: reply2.author_id,
                reply_id: reply2._id,
                experience_id: reply2.experience_id,
            }, {
                user_id: fake_other_user._id,
                reply_id: reply3._id,
                experience_id: reply3.experience_id,
            }];
            return db.collection('reply_likes').insertMany(testLikes);
        }));

        it('should get replies, and the fields are correct', () => request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'replies');
                    assert.isArray(res.body.replies);
                    assert.notDeepProperty(res.body, 'replies.0.author_id');
                    assert.deepProperty(res.body, 'replies.0._id');
                    assert.deepProperty(res.body, 'replies.0.content');
                    assert.deepProperty(res.body, 'replies.0.like_count');
                    assert.deepProperty(res.body, 'replies.0.created_at');
                    assert.deepProperty(res.body, 'replies.0.floor');
                    assert.lengthOf(res.body.replies, 20, '不給 limit 的最大回傳數量');
                }));

        it('get experiences replies data and expect 200 replies ', () => request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    limit: 200,
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'replies.0.author_id');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, TEST_REPLIES_COUNT);
                }));

        it('should not see liked (true/false) if not autheticated', () => request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'replies');
                    assert.isArray(res.body.replies);
                    assert.notDeepProperty(res.body, 'replies.0.liked');
                    assert.notDeepProperty(res.body, 'replies.1.liked');
                }));

        it('should see liked (true/false) if autheticated', () => {
            const request_as_fake_user = request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'replies');
                    assert.isArray(res.body.replies);
                    assert.isTrue(res.body.replies[0].liked, 'fake_user 對 reply1 按過讚');
                    assert.isTrue(res.body.replies[1].liked, 'fake_user 對 reply2 按過讚');
                    assert.isFalse(res.body.replies[2].liked, 'fake_user 對 reply3 沒表達 like');
                });
            const request_as_fake_other_user = request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    access_token: 'otherFakeAccessToken',
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'replies');
                    assert.isArray(res.body.replies);
                    assert.isFalse(res.body.replies[0].liked, 'fake_other_user 對 reply1 沒表達 like');
                    assert.isFalse(res.body.replies[1].liked, 'fake_other_user 對 reply2 沒表達 like');
                    assert.isTrue(res.body.replies[2].liked, 'fake_other_user 對 reply3 按過讚');
                });

            return Promise.all([
                request_as_fake_user,
                request_as_fake_other_user,
            ]);
        });

        it('get experiences replies data by start 0 and limit 100 , expect 100 replies ', () => request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    limit: 100,
                    start: 0,
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author_id');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, 100);
                }));

        it('set error replies and expect error code 404', () => request(app)
                .get('/experiences/1111/replies')
                .query({
                    access_token: 'fakeaccesstoken',
                })
                .expect(404));

        it('limit = 2000  and expect error code 402', () => request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    access_token: 'fakeaccesstoken',
                    limit: 2000,
                })
                .expect(422));

        it('get one experiences replies , and validate return field', () => request(app)
                .get(`/experiences/${experience_id_string}/replies`)
                .query({
                    limit: 1,
                    start: 0,
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body.replies[0], 'author_id');

                    assert.deepProperty(res.body.replies[0], '_id');
                    assert.deepProperty(res.body.replies[0], 'content');
                    assert.deepProperty(res.body.replies[0], 'like_count');
                    assert.deepProperty(res.body.replies[0], 'liked');
                    assert.deepProperty(res.body.replies[0], 'created_at');
                    assert.deepProperty(res.body.replies[0], 'floor');
                }));

        after(() => {
            const pro1 = db.collection('replies').remove({});
            const pro2 = db.collection('experiences').remove({});
            const pro3 = db.collection('reply_likes').remove({});
            return Promise.all([pro1, pro2, pro3]);
        });

        after(() => {
            sandbox.restore();
        });
    });
});
