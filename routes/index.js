var express = require('express');
var router = express.Router();
var request = require('request');
var cors = require('./cors');
var HttpError = require('./errors').HttpError;
var db = require('../libs/db');

router.use(cors);

function createError(message, status) {
    var err = new Error(message);
    err.status = status;

    return err;
}

router.post('/', function(req, res, next) {
    if (process.env.SKIP_FACEBOOK_AUTH) {
        console.log("skip facebook auth");

        next();
    } else {
        var access_token = req.body.access_token;

        if (! access_token) {
            next(createError("access_token is required", 429));

            return;
        } else if (access_token === "") {
            next(createError("access_token is required", 429));

            return;
        }

        console.log("facebook auth with access_token " + access_token);

        request.get({
            url: "https://graph.facebook.com/v2.6/me",
            qs: {
                access_token: access_token,
                fields: "id,name",
                format: "json",
            }
        }, function(error, response, body) {
            if (error) {
                console.log("request error");
                next(createError("access_token is invalid", 401));

                return;
            }

            var content = JSON.parse(body);

            if (content.error) {
                console.log("request response with error field");
                next(createError("access_token is invalid", 401));

                return;
            }

            req.facebook = {id: content.id, name: content.name};

            next();
        });
    }
});

router.post('/', function(req, res, next) {
    var author = {};

    if (req.body.email && (typeof req.body.email === "string") && req.body.email !== "") {
        author.email = req.body.email;
    }

    if (req.facebook) {
        author.id = req.facebook.id,
        author.name = req.facebook.name,
        author.type = "facebook";
    } else {
        author.type = "test";
    }

    var data = {
        author: author,
        company: {},
        created_at: new Date(),
    };

    // pick these fields only
    // make sure the field is string
    [
        "job_title", "week_work_time",
        "salary_min", "salary_max", "salary_type",
        "work_year", "review",
    ].forEach(function(field, i) {
        if (req.body[field] && (typeof req.body[field] === "string") && req.body[field] !== "") {
            data[field] = req.body[field];
        }
    });
    if (req.body.company_id && (typeof req.body.company_id === "string") && req.body.company_id !== "") {
        data.company.id = req.body.company_id;
    }
    if (req.body.company_name && (typeof req.body.company_name === "string") && req.body.company_name !== "") {
        data.company.name = req.body.company_name;
    }

    try {
        if (! data.job_title) {
            throw new HttpError("job_title is required", 422);
        }
        if (! data.week_work_time) {
            throw new HttpError("week_work_time is required", 422);
        }
        data.week_work_time = parseInt(data.week_work_time);
        if (isNaN(data.week_work_time)) {
            throw new HttpError("week_work_time need to be a number", 422);
        }

        if (! (data.company.id || data.company.name)) {
            throw new HttpError("company_id or company_name is required", 422);
        }
    } catch (err) {
        next(err);
        return;
    }

    var collection = db.get().collection("workings");

    collection.insert(data).then(function(result) {
        res.send(data);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
