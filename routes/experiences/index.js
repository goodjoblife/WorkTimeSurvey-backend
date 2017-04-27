const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const lodash = require('lodash');
const winston = require('winston');
const ExperienceModel = require('../../models/experience_model');

/**
 * Get /experiences api
 * @param {string} search_query - "goodjob"
 * @param {string} search_by - "compnay"/"job_title"
 * @param {string} sort - "created_at"
 * @param {string} page - "0"
 * @param {string} limit - "20"
 * @param {string} type - "interview"/"work"
 *
 * @returns {object}
 *  - {
 *      total_pages : 1,
 *      page : 0,
 *      experiences : [
 *          _id : ObjectId,
 *          type : "interview"/"work",
 *          created_at : new Date(),
 *          company : {
 *              id : "abcdef123",
 *              name : "goodjob"
 *          },
 *          job_title : "abcde",
 *          title : "hello",
 *          preview : "hello world XBCDE",
 *          like_count : 0,
 *          reply_count : 0
 *      ]
 *  }
 */
router.get('/', function(req, res, next) {
    winston.info(req.originalUrl, {
        query: req.query,
        ip: req.ip,
        ips: req.ips,
    });

    if (!_isValidSearchByField(req.query.search_by)) {
        next(new HttpError("search by 格式錯誤", 422));
        return;
    }
    const sort_field = req.query.sort || "created_at";
    if (!_isValidSortField(sort_field)) {
        next(new HttpError("sort by 格式錯誤", 422));
        return;
    }
    const query = _queryToDBQuery(req.query.search_query, req.query.search_by, req.query.type);
    const sort = {
        [sort_field]: -1,
    };
    const page = parseInt(req.query.page) || 0;
    const limit = req.query.limit || 25;
    const skip = limit * page;

    let result = {};
    const experience_model = new ExperienceModel(req.db);
    experience_model.getExperiencesCountByQuery(query).then((count) => {
        result.total_pages = Math.ceil(count / limit);
        return experience_model.getExperiences(query, sort, skip, limit);
    }).then((docs) => {
        result.page = page;
        result.experiences = docs;
        result.experiences.map(_modelMapToViewModel);
        res.send(result);
    }).catch((err) => {
        next(new HttpError("Internal Service Error", 500));
    });
});

function _modelMapToViewModel(experience) {
    const sections = experience.sections;
    experience.preview = sections[0].content;
    delete experience.sections;
}

function _isValidSearchByField(search_by) {
    if (!search_by) {
        return true;
    }
    const Default_Field = ["company", "job_title"];
    return Default_Field.includes(search_by);
}

function _isValidSortField(sort_by) {
    if (!sort_by) {
        return true;
    }
    const Default_Field = ["created_at", "job_title"];
    return Default_Field.includes(sort_by);
}

/**
 * _queryToDBQuery
 *
 * @param {string} search_query - search text
 * @param {string} search_by - "company" / "job_title"
 * @param {string} type - "interview" / "work"
 * @returns {object} - mongodb find object
 */
function _queryToDBQuery(search_query, search_by, type) {
    let query = {};
    if (!(search_by && search_query || type)) {
        return query;
    }

    if (search_by == "job_title") {
        query.job_title = new RegExp(lodash.escapeRegExp(search_query.toUpperCase()));
    } else {
        if (search_query) {
            query["$or"] = [{
                'company.name': new RegExp(lodash.escapeRegExp(search_query.toUpperCase())),
            }, {
                'company.id': search_query,
            }];
        }
    }

    if (type) {
        const types = type.split(',');
        if (types.length == 1) {
            query.type = types[0];
        } else {
            query.type = {
                $in: types,
            };
        }
    }
    return query;
}

router.get('/:id', function(req, res, next) {
    const id = req.params.id;
    winston.info('experiences/id', {
        id: id,
        ip: req.ip,
        ips: req.ips,
    });

    const experience_model = new ExperienceModel(req.db);
    experience_model.getExperienceById(id).then((result) => {
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
