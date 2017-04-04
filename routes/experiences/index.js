const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const lodash = require('lodash');
const winston = require('winston');
const ExperienceService = require('../../services/experience_service');

// 查詢面試及工作經驗 API
router.get('/', function(req, res, next) {
    const query = {};

    if (req.query.search_query && req.query.search_field) {
        if (!["company", "job_title"].includes(req.query.search_field)) {
            next(new HttpError('search_field error', 422));
            return;
        }

        if (req.query.search_field === 'company') {
            query["$or"] = [
                {'company.name': new RegExp(lodash.escapeRegExp(req.query.search_query.toUpperCase()))},
                {'company.id': req.query.search_query},
            ];
        } else if (req.query.search_field === 'job_title') {
            query.job_title = new RegExp(lodash.escapeRegExp(req.query.search_query.toUpperCase()));
        }
    }

    req.find_query = query;
    next();
});
router.get('/', function(req, res, next) {
    const sort_by = req.query.sort_by || 'created_at';
    if (!["created_at", "popular"].includes(sort_by)) {
        next(new HttpError('sort_by error', 422));
        return;
    }

    req.sort_by = {};
    req.sort_by[sort_by] = -1;
    next();
});
router.get('/', function(req, res, next) {
    const page = parseInt(req.query.page) || 0;

    req.pagination = {
        page: page,
    };
    next();
});
router.get('/', function(req, res, next) {
    winston.info(req.originalUrl, {query: req.query, ip: req.ip, ips: req.ips});

    const collection = req.db.collection('experiences');
    const opt = {
        _id: 1,
        type: 1,
        created_at: 1,
        company: 1,
        job_title: 1,
        title: 1,
        sections: 1,
        like_count: 1,
        reply_count: 1,
        share_count: 1,
    };

    const find_query = req.find_query;
    const sort_by = req.sort_by;
    const page = req.pagination.page;
    const limit = 25;

    const data = {};
    collection.count().then(function(count) {
        data.total = count;

        return collection.find(find_query, opt).sort(sort_by).skip(limit * page).limit(limit).toArray();
    }).then(function(results) {
        data.experiences = results;

        res.send(data);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

router.get('/:id', function(req, res, next) {
    const id = req.params.id;
    winston.info('experiences/id', {
        id: id,
        ip: req.ip,
        ips: req.ips,
    });

    const experience_service = new ExperienceService(req.db);
    experience_service.getExperienceById(id).then((result) => {
        res.send(result);
    }).catch((err) => {
        if (err instanceof ObjectNotExistError) {
            next(new HttpError(err.message, 404));
        } else {
            next(new HttpError("Internal Service Error", 500));
        }
    });

});
router.use('/', require('./replies'));
router.use('/', require('./likes'));

module.exports = router;
