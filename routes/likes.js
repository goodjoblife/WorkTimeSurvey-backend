const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const facebook = require('../libs/facebook');
const ObjectId = require('mongodb').ObjectId;
const winston = require('winston');

/*
 * When developing, you can set environment to skip facebook auth
 */
if (! process.env.SKIP_FACEBOOK_AUTH) {
    router.post('/', function(req, res, next) {
        var access_token = req.body.access_token;

        facebook.accessTokenAuth(access_token).then(function(facebook) {
            winston.info("facebook auth success", {access_token: access_token, ip: req.ip, ips: req.ips});

            req.custom.facebook = facebook;
            next();
        }).catch(function(err) {
            winston.info("facebook auth fail", {access_token: access_token, ip: req.ip, ips: req.ips});

            next(new HttpError("Unauthorized", 401));
        });
    });
}

router.post('/:id/likes', (req, res, next) => {
    winston.info(req.originalUrl, {query: req.query, ip: req.ip, ips: req.ips});

    const id =  req.params.id;
    if(typeof id === 'undefined'){
        next(new HttpError('id error'), 422);
        return;
    }

    const author = {};
    console.log(req.custom);
    if (req.custom && req.custom.facebook) {
        author.id = req.custom.facebook.id,
        author.name = req.custom.facebook.name,
        author.type = "facebook";
    } else {
        author.id = "-1";
        author.type = "test";
    }

    const collection = req.db.collection('likes');
    const data = {
        "user": author,
        "ref": {
            "$ref": "replies",
            "$id": new ObjectId(id),
        }
    };

    //Notice: please ensure unique index has been applied on (user, ref)
    collection.insert(data).then(results => {
        winston.info("user likes a reply successfully", {id: results.insertedIds[1], ip: req.ip, ips: req.ips});
        res.send({success: true});
    }).catch(err => {
        if(err.code === 11000){  //E11000 duplicate key error
            next(new HttpError("已重複按讚！", 403));
        } else {
            next(err);
        }
    })
});

module.exports = router;
