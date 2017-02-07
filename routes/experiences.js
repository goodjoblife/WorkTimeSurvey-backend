const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const facebook = require('../libs/facebook');
//const lodash = require('lodash');
const winston = require('winston');
const helper = require('./workings_helper');

router.post('/interview_experiences', (req, res, next) => {
    const access_token = req.body.access_token;

    facebook.accessTokenAuth(access_token).then(facebook => {
        winston.info("facebook auth success", {access_token: access_token, ip: req.ip, ips: req.ips});

        req.custom.facebook = facebook;
    }).then(() => {
        const data_fields = [
            // Required
            "job_title",
            "interview_time",
            // Optional
            "education",
            "salary",
            "working_experiences",
            "shared_experiences",
        ];

        collectExperienceData(req, data_fields).then(next, next);
    }).catch(function(err) {
        winston.info("facebook auth fail", {access_token: access_token, ip: req.ip, ips: req.ips});

        next(new HttpError("Unauthorized", 401));
    });
}, (req, res, next) => {
    validation(req).then(next, next);
}, main);


function collectExperienceData(req, fields) {
    req.custom = {};
    const author = req.custom.author = {};
    const experience = req.custom.experience = {
        author: author,
        company: {},
        created_at: new Date(),
    };

    //
    // facebook auth not done
    //
    if (req.custom.facebook) {
        author.id = req.custom.facebook_id;
        author.name = req.custom.facebook.name;
        author.type = "facebook";
    } else {
        author.id = "-1";
        author.type = "test";
    }

    // pick fields only
    // make sure the field is string
    fields.forEach((field) => {
        if (checkBodyField(req, field)) {
            experience[field] = req.body[field];
        }
    });
    if (checkBodyField(req, "company_id")) {
        experience.company.id = req.body.company_id;
    }
    if (checkBodyField(req, "company")) {
        req.custom.company_query = req.body.company;
    }

    return Promise.resolve();
}

function validation(req) {
    const custom = req.custom;

    try {
        validateData(custom);
    } catch (err) {
        winston.info("validating fail", {ip: req.ip, ips: req.ips});

        return Promise.reject(err);
    }

    return Promise.resolve();
}

function validateData(custom) {
    const data = custom.experience;

    if (! data.company.id) {
        if (! custom.company_query) {
            throw new HttpError("公司/單位名稱要填喔!", 422);
        }
    }
    if (! data.job_title) {
        throw new HttpError("職稱要填喔!", 422);
    }
    if (! data.interview_time) {
        throw new HttpError("留一下面試時間吧~", 422);
    }

}

function checkBodyField(req, field) {
    if (req.body[field] && (typeof req.body[field] === "string") && req.body[field] !== "") {
        return true;
    } else {
        return false;
    }
}

function main(req, res, next) {
    const experience = req.custom.experience;
    const company_query = req.custom.company_query;
    const response_data = {
        experience: experience,
    };
    const collection = req.db.collection("experiences");

    /*
     * Normalize the data
     */
    experience.job_title = experience.job_title.toUpperCase();

    /*
     *  這邊處理需要呼叫async函數的部份
     */
    /*
     * 如果使用者有給定 company id，將 company name 補成查詢到的公司
     *
     * 如果使用者是給定 company name，如果只找到一間公司，才補上 id
     *
     * 其他情況看 issue #7
     */
    helper.normalizeCompany(req.db, experience.company.id, company_query).then(company => {
        experience.company = company;
    }).then(() => {
        return collection.insert(experience);
    }).then(() => {
        winston.info("experiences insert data success", {id: experience._id, ip: req.ip, ips: req.ips});

        res.send(response_data);
    }).catch(err => {
        winston.info("experiences insert data fail", {id: experience._id, ip: req.ip, ips: req.ips, err: err});

        next(err);
    });
}

module.exports = router;
