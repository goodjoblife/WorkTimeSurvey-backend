const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../../app');
const { MongoClient, ObjectId, DBRef } = require('mongodb');
const sinon = require('sinon');
const config = require('config');

const authentication = require('../../../libs/authentication');

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

    describe('POST /experiences/:id/reports', () => {
        let experience_id_str;
        let sandbox;

        beforeEach('Mock user', () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);

            return cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'other_fakeaccesstoken')
                .resolves(fake_other_user);
        });

        beforeEach('Create test data', () => db.collection('experiences').insertOne({
            type: 'interview',
            author_id: new ObjectId(),
            status: "published",
            like_count: 0,
            report_count: 0,
        }).then((result) => {
            experience_id_str = result.insertedId.toString();
        }));

        it('should return 200 and correct fields if succeed', () => {
            const req = request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send(generatePayload('fakeaccesstoken'))
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'report');
                    assert.deepProperty(res.body, 'report._id');
                    assert.deepPropertyVal(res.body, 'report.reason_category', '我認為這篇文章內容不實');
                    assert.deepPropertyVal(res.body, 'report.reason', 'This is not true');
                    assert.deepProperty(res.body, 'report.created_at');
                    assert.notDeepProperty(res.body, 'report.user');
                });

            const check_experiences_collection = req
                .then(() =>
                    db.collection('experiences').findOne({ _id: ObjectId(experience_id_str) })
                        .then((experience) => {
                            assert.equal(experience.report_count, 1);
                        }));

            const check_reports_collection = req
                .then(res =>
                    db.collection('reports').findOne({ ref: DBRef('experiences', ObjectId(experience_id_str)) })
                        .then((report) => {
                            assert.isNotNull(report);
                            assert.equal(report.reason_category, '我認為這篇文章內容不實');
                            assert.equal(report.reason, 'This is not true');
                            assert.property(report, 'created_at');
                            assert.deepEqual(report.user_id, fake_user._id);
                        }));

            return Promise.all([
                check_experiences_collection,
                check_reports_collection,
            ]);
        });

        it('should fail, because reason_category is required', () => request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(422));

        it('should return 404, if experience does not exist', () => request(app)
                .post('/experiences/1111/reports')
                .send(generatePayload('fakeaccesstoken'))
                .expect(404));

        it('(! Need Index) should return 403, if post report 2 times', () => request(app).post(`/experiences/${experience_id_str}/reports`)
                .send(generatePayload('fakeaccesstoken'))
                .then(response => request(app)
                        .post(`/experiences/${experience_id_str}/reports`)
                        .send(generatePayload('fakeaccesstoken'))
                        .expect(403)));

        it('should return 401, if user does not login', () => request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .expect(401));

        it('report_count should 1, if post report and get experience', () => request(app).post(`/experiences/${experience_id_str}/reports`)
                .send(generatePayload('fakeaccesstoken'))
                .then(res => db.collection("experiences")
                        .find({
                            _id: new ObjectId(experience_id_str),
                        })
                        .toArray()
                        .then((result) => {
                            assert.equal(result[0].report_count, 1);
                        })));

        it('(! Need Index), report_count should be 1, if post report 2 times (same user) and get experience', () => {
            const uri = `/experiences/${experience_id_str}/reports`;
            return request(app).post(uri)
                .send(generatePayload('fakeaccesstoken'))
                .then(res => request(app).post(uri)
                        .send(generatePayload('fakeaccesstoken')))
                .then(res => db.collection("experiences")
                        .find({
                            _id: new ObjectId(experience_id_str),
                        })
                        .toArray())
                .then((result) => {
                    assert.equal(result[0].report_count, 1);
                });
        });

        it('report_count should be 2 , if post report 2 times(different user) and get experience', () => {
            const uri = `/experiences/${experience_id_str}/reports`;
            return request(app).post(uri)
                .send(generatePayload('fakeaccesstoken'))
                .then(res => request(app).post(uri)
                        .send(generatePayload('other_fakeaccesstoken')))
                .then(res => db.collection("experiences")
                        .find({
                            _id: new ObjectId(experience_id_str),
                        })
                        .toArray())
                .then((result) => {
                    assert.equal(result[0].report_count, 2);
                });
        });

        afterEach(() => {
            sandbox.restore();
            const pro1 = db.collection('reports').remove();
            const pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });
    });

    describe('GET /experiences/:id/reports', () => {
        let experience_id_str;
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

        before('create test data', () => db.collection('experiences').insertOne({
            type: 'interview',
            author_id: fake_user._id,
            report_count: 2,
        }).then((result) => {
            experience_id_str = result.insertedId.toString();

            const testData = {
                created_at: new Date(),
                user_id: fake_user._id,
                reason_category: '我認為這篇文章內容不實',
                reason: 'This is not true',
                ref: DBRef('experiences', ObjectId(experience_id_str)),
            };
            const testData2 = {
                created_at: new Date(),
                user_id: fake_other_user._id,
                reason_category: '我認為這篇文章內容不實',
                reason: 'This is not true',
                ref: DBRef('experiences', ObjectId(experience_id_str)),
            };

            return Promise.all([
                db.collection('reports').insertOne(testData),
                db.collection('reports').insertOne(testData2),
            ]);
        }));

        it('should get reports, and the fields are correct', () => request(app)
            .get(`/experiences/${experience_id_str}/reports`)
            .expect(200)
            .expect((res) => {
                assert.property(res.body, 'reports');
                assert.isArray(res.body.reports);
                assert.lengthOf(res.body.reports, 2);
                assert.notDeepProperty(res.body, 'reports.0.user_id');
                assert.deepProperty(res.body, 'reports.0.reason');
                assert.deepProperty(res.body, 'reports.0.reason_category');
                assert.deepProperty(res.body, 'reports.0.created_at');
                assert.notDeepProperty(res.body, 'reports.1.user_id');
                assert.deepProperty(res.body, 'reports.1.reason');
                assert.deepProperty(res.body, 'reports.1.reason_category');
                assert.deepProperty(res.body, 'reports.1.created_at');
            }
        ));

        it('set error reports and expect error code 404', () => request(app)
                .get('/experiences/1111/reports')
                .query({
                    access_token: 'fakeaccesstoken',
                })
                .expect(404));

        it('limit = 2000  and expect error code 402', () => request(app)
                .get(`/experiences/${experience_id_str}/reports`)
                .query({
                    access_token: 'fakeaccesstoken',
                    limit: 2000,
                })
                .expect(422));

        after(() => {
            const pro1 = db.collection('reports').remove({});
            const pro2 = db.collection('experiences').remove({});
            const pro3 = db.collection('repoerts').remove({});
            return Promise.all([pro1, pro2, pro3]);
        });

        after(() => {
            sandbox.restore();
        });
    });
});
