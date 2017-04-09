const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const lodash = require('lodash');
const winston = require('winston');
const ExperienceService = require('../../services/experience_service');

/**
 * Get /experiences api
 * @param {object} req.query
 *  - {
 *      search_query = "GoodJob".
 *      search_by = "compnay",
 *      sort = "created_at",
 *      page = 0,
 *      limit = 20,
 *      type = "interview"
 *  }
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
    }
    const sort_field = req.query.sort || "created_at";
    if (!_isValidSortField(sort_field)) {
        next(new HttpError("sort by 格式錯誤", 422));
    }
    const query = _queryToDBQuery(req.query.search_query, req.query.search_by);
    const sort = {
        [sort_field]: -1,
    };
    const page = parseInt(req.query.page) || 0;
    const limit = req.query.limit || 25;
    const skip = limit * page;

    let result = {};
    const experience_service = new ExperienceService(req.db);
    experience_service.getExperiencesCountByQuery(query).then((count) => {
        result.total_pages = Math.ceil(count / limit);
        return experience_service.getExperiences(query, sort, skip, limit);
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

function _queryToDBQuery(search_query, search_by) {
    let query = {};
    if (!(search_by && search_query)) {
        return query;
    }

    if (search_by == "company") {
        query["$or"] = [{
            'company.name': new RegExp(lodash.escapeRegExp(search_query.toUpperCase())),
        }, {
            'company.id': search_query,
        }];
    } else if (search_by == "job_title") {
        query.job_title = new RegExp(lodash.escapeRegExp(search_query.toUpperCase()));
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
