const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const lodash = require('lodash');
const winston = require('winston');
const ExperienceModel = require('../../models/experience_model');
const ExperienceLikeModel = require('../../models/experience_like_model');
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
    shouldIn,
} = require('../../libs/validation');
const authentication = require('../../middlewares/authentication_user');

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

    if (search_query) {
        if (!search_by) {
            next(new HttpError("search_by 不能為空", 422));
            return;
        }
        if (!shouldIn(search_by, ["company", "job_title"])) {
            next(new HttpError("search_by 格式錯誤", 422));
            return;
        }
    }

    if (!shouldIn(sort_field, ["created_at", "popularity"])) {
        next(new HttpError("sort_by 格式錯誤", 422));
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

    const db_sort_field = (sort_field == 'popularity') ? 'like_count'  : sort_field;
    const sort = {
        [db_sort_field]: -1,
    };

    let total;
    const experience_model = new ExperienceModel(req.db);
    experience_model.getExperiencesCountByQuery(query).then((count) => {
        total = count;
        return experience_model.getExperiences(query, sort, start, limit);
    }).then((experiences) => {
        res.send(_generateGetExperiencesViewModel(experiences, total));
    }).catch((err) => {
        next(new HttpError("Internal Service Error", 500));
    });
});

function _generateGetExperiencesViewModel(experiences, total) {
    const MAX_PREVIEW_SIZE = 160;

    const view_experiences = experiences.map(experience => {
        let experience_view_model = {
            _id: experience._id,
            type: experience.type,
            created_at: experience.created_at,
            company: experience.company,
            job_title: experience.job_title,
            title: experience.title,
            preview: (() => {
                if (experience.sections[0]) {
                    return experience.sections[0].content.substring(0, MAX_PREVIEW_SIZE);
                } else {
                    return null;
                }
            })(),
            like_count: experience.like_count,
            reply_count: experience.reply_count,
        };
        if (experience.type === 'interview') {
            experience_view_model = Object.assign(experience_view_model, {
                region: experience.region,
                salary: experience.salary,
            });
        } else if (experience.type === 'work') {
            experience_view_model = Object.assign(experience_view_model, {
                region: experience.region,
                salary: experience.salary,
                week_work_time: experience.week_work_time,
            });
        }
        return experience_view_model;
    });

    const result = {
        total,
        experiences: view_experiences,
    };

    return result;
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

router.get('/:id', [
    authentication.cachedAndSetUserMiddleware,
    function(req, res, next) {
        const id = req.params.id;
        let user = null;
        winston.info('experiences/id', {
            id: id,
            ip: req.ip,
            ips: req.ips,
        });

        if (req.user) {
            user = {
                id: req.user.facebook_id,
                type: 'facebook',
            };
        }

        const experience_model = new ExperienceModel(req.db);
        const experience_like_model = new ExperienceLikeModel(req.db);
        experience_model.getExperienceById(id).then((experience) => {
            if (user) {
                return experience_like_model.getLikeByExperienceIdAndUser(id, user)
                    .then(like => _generateGetExperienceViewModel(experience, user, like));
            } else {
                return _generateGetExperienceViewModel(experience);
            }
        }).then((result) => {
            res.send(result);
        }).catch((err) => {
            if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Service Error", 500));
            }
        });
    },
]);

function _generateGetExperienceViewModel(experience, user, like) {
    let result = {
        _id: experience._id,
        type: experience.type,
        created_at: experience.created_at,
        company: experience.company,
        job_title: experience.job_title,
        experience_in_year: experience.experience_in_year,
        education: experience.education,
        region: experience.region,
        title: experience.title,
        sections: experience.sections,
        like_count: experience.like_count,
        reply_count: experience.reply_count,
    };

    if (user) {
        result.liked = (like) ? true : false;
    }

    if (experience.type == 'interview') {
        result = Object.assign(result, {
            interview_time: experience.interview_time,
            interview_result: experience.interview_result,
            overall_rating: experience.overall_rating,
            salary: experience.salary,
            interview_sensitive_questions: experience.interview_sensitive_questions,
            interview_qas: experience.interview_qas,
        });
    } else if (experience.type == 'work') {
        result = Object.assign(result, {
            salary: experience.salary,
            week_work_time: experience.week_work_time,
            data_time: experience.data_time,
            recommend_to_others: experience.recommend_to_others,
        });
    }

    return result;
}

router.use('/', require('./replies'));
router.use('/', require('./likes'));

module.exports = router;
