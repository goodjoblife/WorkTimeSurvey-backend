const express = require('express');
const mongo = require('mongodb');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const winston = require('winston');

router.get('/experiences/:id', function(req, res, next) {
    const id = req.params.id;
    winston.info('experiences/id', {
        id: id,
        ip: req.ip,
        ips: req.ips,
    });

    if (!id) {
        next(new HttpError(' id error'), 422);
        return;
    }

    const opt = {
        _id: 1,
        type: 1,
        company: 1,
        job_title: 1,
        title: 1,
        sections: 1,
        like_count: 1,
        reply_count: 1,
        share_count: 1,
    };
    const collection = req.db.collection('experiences');
    collection.find({
        "_id": new mongo.ObjectId(id),
    }, opt).toArray(function(err, result) {
        res.send({experience: result[0]});
    });
});

module.exports = router;
