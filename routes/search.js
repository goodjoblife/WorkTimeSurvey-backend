var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var cors = require('./cors');
var HttpError = require('./errors').HttpError;
var db = require('../libs/db');

router.use(cors);

router.get('/', function(req, res, next) {
    var search = req.query.key || "";
    var page = req.query.page || 0;
    var q;

    if (search == "") {
        q = {};
    } else {
        q = {name: new RegExp("^" + search)};
    }

    var collection = db.get().collection('companies');

    collection.find(q).skip(25 * page).limit(25).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
