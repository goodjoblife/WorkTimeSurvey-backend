const chai = require('chai');
chai.use(require('chai-datetime'));
const assert = chai.assert;
const app = require('../app');
const request = require('supertest')(app);
const MongoClient = require('mongodb').MongoClient;

describe('Experiences 面試和工作經驗資訊', function() {
    var db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    describe('GET /experiences/:id', function() {

        let testId = undefined;

        before('Creating experiences', function() {
            return db.collection('experiences').insertOne({
                type: "interview",
                created_at: new Date("2017-03-20T10:00:00.929Z"),
                author: {
                    type: "facebook",
                    _id: "123",
                },
                company: {
                    id: "abcde01",
                    name: "GoodJob",
                },
                area: "台北",
                job_title: "Junior backend engineer",
                interview_time_year: "2017",
                interview_time_month: "3",
                title: "XXX面試洗臉記",
                sections: [{
                    subtitle: "人資的問話",
                    content: "人資妹子好啊",
                }, {
                    subtitle: "被洗臉了",
                    content: "被洗到好慘",
                }],
                education: "碩士",
                status: "draft",
                like_count: 1,
                reply_count: 1,
                share_count: 1,
            }, function(err, result) {
                testId = result.insertedId.toString();
            });
        });

        it('Get url /experience/:id and expected get one data', function() {
            return request.get("/experiences/" + testId)
                .expect(200)
                .expect(function(res) {
                    assert.deepProperty(res.body, 'experience');
                    assert.equal(res.body.experience._id, testId);
                });
        });
    });
});
