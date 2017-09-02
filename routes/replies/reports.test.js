const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../app');
const { MongoClient, ObjectId, DBRef } = require('mongodb');
const sinon = require('sinon');
const config = require('config');

const authentication = require('../../libs/authentication');

function generatePayload(access_token) {
    return {
        access_token,
        reason_category: '我認為這篇文章內容不實',
        reason: 'This is not true',
    };
}


describe('Reports Test', () => {
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

    describe('POST /replies/:id/reports', () => {
        let reply_id_str;
        let sandbox;

        beforeEach('Mock user', () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'other_fakeaccesstoken')
                .resolves(fake_other_user);
        });

        beforeEach('Create test data', () => db.collection('replies').insertOne({
            content: "this is a reply",
            author_id: new ObjectId(),
            like_count: 0,
            report_count: 0,
        }).then((result) => {
            reply_id_str = result.insertedId.toString();
        }));

        it('should return 200 and correct fields if succeed', async () => {
            const res = await request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .send(generatePayload('fakeaccesstoken'))
                .expect(200);
            assert.property(res.body, 'report');
            assert.deepProperty(res.body, 'report._id');
            assert.deepPropertyVal(res.body, 'report.reason_category', '我認為這篇文章內容不實');
            assert.deepPropertyVal(res.body, 'report.reason', 'This is not true');
            assert.deepProperty(res.body, 'report.created_at');
            assert.notDeepProperty(res.body, 'report.user');

            const reply = await db.collection('replies').findOne({ _id: ObjectId(reply_id_str) });
            assert.equal(reply.report_count, 1);

            const report = await db.collection('reports').findOne({ ref: DBRef('replies', ObjectId(reply_id_str)) });
            assert.isNotNull(report);
            assert.equal(report.reason_category, '我認為這篇文章內容不實');
            assert.equal(report.reason, 'This is not true');
            assert.property(report, 'created_at');
            assert.deepEqual(report.user_id, fake_user._id);
        });

        it('should return 422, because reason_category is required', () => request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(422));

        it('should return 200 and correct fields, while reason_category is "這是廣告或垃圾訊息" and reason is not given', () => request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .send({
                    access_token: 'fakeaccesstoken',
                    reason_category: '這是廣告或垃圾訊息',
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'report');
                    assert.deepProperty(res.body, 'report._id');
                    assert.deepPropertyVal(res.body, 'report.reason_category', '這是廣告或垃圾訊息');
                    assert.notDeepProperty(res.body, 'report.reason');
                    assert.deepProperty(res.body, 'report.created_at');
                    assert.notDeepProperty(res.body, 'report.user');
                })
        );

        it('should return 422, while reason_category is not "這是廣告或垃圾訊息" and reason is undefiend', () => request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .send({
                    access_token: 'fakeaccesstoken',
                    reason_category: '我認為這篇文章內容不實',
                })
                .expect(422));

        it('should return 404, if reply does not exist', () => request(app)
                .post('/replies/1111/reports')
                .send(generatePayload('fakeaccesstoken'))
                .expect(404));

        it('(! Need Index) should return 403, if post report 2 times', async () => {
            await request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .send(generatePayload('fakeaccesstoken'));

            await request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .send(generatePayload('fakeaccesstoken'))
                .expect(403);
        });

        it('should return 401, if user does not login', () => request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .expect(401));

        it('report_count should 1, if post report and get reply', async () => {
            await request(app)
                .post(`/replies/${reply_id_str}/reports`)
                .send(generatePayload('fakeaccesstoken'));
            const result = await db.collection("replies")
                .find({
                    _id: new ObjectId(reply_id_str),
                }).toArray();

            assert.equal(result[0].report_count, 1);
        });

        it('(! Need Index), report_count should be 1, if post report 2 times (same user) and get reply', async () => {
            const uri = `/replies/${reply_id_str}/reports`;
            await request(app)
                .post(uri)
                .send(generatePayload('fakeaccesstoken'));
            await request(app)
                .post(uri)
                .send(generatePayload('fakeaccesstoken'));
            const result = await db.collection("replies")
                .find({
                    _id: new ObjectId(reply_id_str),
                }).toArray();

            assert.equal(result[0].report_count, 1);
        });

        it('report_count should be 2 , if post report 2 times(different user) and get reply', async () => {
            const uri = `/replies/${reply_id_str}/reports`;
            await request(app)
                .post(uri)
                .send(generatePayload('fakeaccesstoken'));
            await request(app)
                .post(uri)
                .send(generatePayload('other_fakeaccesstoken'));

            const result = await db.collection("replies")
                .find({
                    _id: new ObjectId(reply_id_str),
                })
                .toArray();
            assert.equal(result[0].report_count, 2);
        });

        afterEach(async () => {
            sandbox.restore();
            await db.collection('reports').remove();
            await db.collection('replies').remove({});
        });
    });

    describe('GET /replies/:id/reports', () => {
        let reply_id_str;
        let reply2_id_str;
        let sandbox = null;

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

        before('create test data', async () => {
            const reply1 = await db.collection('replies').insertOne({
                content: "this is a reply",
                author_id: new ObjectId(),
                like_count: 0,
                report_count: 2,
            });
            const reply2 = await db.collection('replies').insertOne({
                content: "this is a reply 2",
                author_id: new ObjectId(),
                like_count: 0,
                report_count: 1,
            });

            reply_id_str = reply1.insertedId.toString();
            reply2_id_str = reply2.insertedId.toString();

            // insert reports for reply1
            await db.collection('reports').insertOne({
                created_at: new Date(),
                user_id: fake_user._id,
                reason_category: '我認為這篇文章內容不實',
                reason: 'reply1 report',
                ref: DBRef('replies', ObjectId(reply_id_str)),
            });
            await db.collection('reports').insertOne({
                created_at: new Date(),
                user_id: fake_other_user._id,
                reason_category: '我認為這篇文章內容不實',
                reason: 'reply1 report',
                ref: DBRef('replies', ObjectId(reply_id_str)),
            });

            // insert report for reply2
            await db.collection('reports').insertOne({
                created_at: new Date(),
                user_id: fake_user._id,
                reason_category: '我認為這篇文章內容不實',
                reason: 'reply2 report',
                ref: DBRef('replies', ObjectId(reply2_id_str)),
            });
        });

        it('should get reports, and the fields are correct', () => request(app)
            .get(`/replies/${reply_id_str}/reports`)
            .expect(200)
            .expect((res) => {
                assert.property(res.body, 'reports');
                assert.isArray(res.body.reports);
                assert.lengthOf(res.body.reports, 2);
                assert.notDeepProperty(res.body, 'reports.0.user_id');
                assert.deepPropertyVal(res.body, 'reports.0.reason', 'reply1 report');
                assert.deepProperty(res.body, 'reports.0.reason_category');
                assert.deepProperty(res.body, 'reports.0.created_at');
                assert.notDeepProperty(res.body, 'reports.1.user_id');
                assert.deepPropertyVal(res.body, 'reports.1.reason', 'reply1 report');
                assert.deepProperty(res.body, 'reports.1.reason_category');
                assert.deepProperty(res.body, 'reports.1.created_at');
            }
        ));

        it('set error reports and expect error code 404', () => request(app)
                .get('/replies/1111/reports')
                .query({
                    access_token: 'fakeaccesstoken',
                })
                .expect(404));

        it('limit = 2000  and expect error code 402', () => request(app)
                .get(`/replies/${reply_id_str}/reports`)
                .query({
                    access_token: 'fakeaccesstoken',
                    limit: 2000,
                })
                .expect(422));

        after(async () => {
            await db.collection('reports').remove({});
            await db.collection('replies').remove({});
        });

        after(() => {
            sandbox.restore();
        });
    });
});
