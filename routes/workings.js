var express = require('express');
var router = express.Router();
var cors = require('./cors');
var HttpError = require('./errors').HttpError;
var db = require('../libs/db');

router.use(cors);

router.get('/', function(req, res, next) {
    var page = req.query.page || 0;

    var collection = db.get().collection('workings');
    var q = {};
    var opt = {
            company_id: 1,
            company_name: 1,
            week_work_time: 1,
            job_title: 1,
            created_at: 1,
        };
    collection.find(q, opt).sort({created_at: -1}).skip(25 * page).limit(25).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
