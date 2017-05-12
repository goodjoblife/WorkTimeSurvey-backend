const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const lodash = require('lodash');
const winston = require('winston');
const ExperienceModel = require('../../models/experience_model');
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
    shouldIn,
} = require('../../libs/validation');

router.get('/', function(req, res, next) {
    winston.info(req.originalUrl, {
        query: req.query,
        ip: req.ip,
        ips: req.ips,
    });

    const search_query = req.query.search_query;
    const search_by = req.query.search_by;
    const sort_field = req.query.sort || "created_at";
    const start = parseInt(req.query.start) || 0;
    const limit = Number(req.query.limit || 20);
    const type = req.query.type;

    if (!search_by) {
        next(new HttpError("search by 不能為空", 422));
        return;
    }

    if (!shouldIn(search_by, ["company", "job_title"])) {
        next(new HttpError("search by 格式錯誤", 422));
        return;
    }
    if (!shouldIn(sort_field, ["created_at", "job_title"])) {
        next(new HttpError("sort by 格式錯誤", 422));
        return;
    }

    if (!requiredNumberGreaterThanOrEqualTo(start, 0)) {
        next(new HttpError("start 格式錯誤", 422));
        return;
    }

    if (!requiredNumberInRange(limit, 100, 1)) {
        next(new HttpError("limit 格式錯誤", 422));
        return;
    }

    const query = _queryToDBQuery(search_query, search_by, type);
    const sort = {
        [sort_field]: -1,
    };

    let result = {};
    const experience_model = new ExperienceModel(req.db);
    experience_model.getExperiencesCountByQuery(query).then((count) => {
        result.total = count;
        return experience_model.getExperiences(query, sort, start, limit);
    }).then((docs) => {
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
