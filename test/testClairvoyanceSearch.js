const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;

describe('Clairvoyance 天眼通 API', function() {
    var db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    before('Seeding some workings', function() {
        return db.collection('workings').insertMany([
            {
                job_title: 'TEST PM',
                company: {
                    id: '00000001',
                    name: 'MY GOODJOB LIFE',
                },
                week_work_time: 40,
                created_at: new Date("2016-08-22 17:00"),
            },
            {
                job_title: 'PM',
                company: {
                    id: '00000001',
                    name: 'MY GOODJOB LIFE',
                },
                week_work_time: 20,
                created_at: new Date("2016-08-22 17:01"),
            },
            {
                job_title: 'TEST2',
                company: {
                    id: '00000001',
                    name: 'MY GOODJOB LIFE',
                },
                week_work_time: 30,
                created_at: new Date("2016-08-22 17:02"),
            },
            {
                job_title: 'TEST3',
                company: {
                    id: '00000002',
                    name: 'YOUR GOODJOB LIFE',
                },
                week_work_time: 50,
                created_at: new Date("2016-08-22 17:03"),
            },
        ]);
    });

    describe('根據公司搜尋', function() {
        it('error 422 if no company provided');

        it('Search and return the pagination results');

        it('小寫 company 轉換成大寫');

        it('company match any substring in workings.company.name');

        it('sort workings by created_at desc');

        it('根據統編搜尋');
    });

    describe('根據職稱搜尋', function() {
        it('error 422 if no job_title provided');

        it('Search and return the pagination results');

        it('小寫 job_title 轉換成大寫');

        it('job_title match any substring in workings.job_title');

        it('sort workings by created_at desc');
    });

    after(function() {
        return db.collection('workings').remove({});
    });
});
