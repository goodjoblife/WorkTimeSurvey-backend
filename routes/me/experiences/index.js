const express = require('express');

const router = express.Router();
const HttpError = require('../../../libs/errors').HttpError;
const winston = require('winston');
const ExperienceModel = require('../../../models/experience_model');
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
} = require('../../../libs/validation');
const wrap = require('../../../libs/wrap');
const authentication = require('../../../middlewares/authentication');
const generateGetExperiencesViewModel = require('../../../view_models/get_experiences');

function _generateDBQuery(author_id, type) {
    const query = {};
    query.author_id = author_id;

    if (type) {
        const types = type.split(',');
        if (types.length === 1) {
            query.type = types[0];
        } else {
            query.type = {
                $in: types,
            };
        }
    }
    return query;
}

router.get('/', [
    authentication.cachedFacebookAuthenticationMiddleware,
    wrap(async (req, res) => {
        winston.info(req.originalUrl, {
            query: req.query,
            ip: req.ip,
            ips: req.ips,
        });

        const user = req.user;
        const start = parseInt(req.query.start, 10) || 0;
        const limit = Number(req.query.limit || 20);
        const sort = {
            created_at: -1,
        };
        const type = req.query.type;
        const query = _generateDBQuery(user._id, type);

        if (!requiredNumberGreaterThanOrEqualTo(start, 0)) {
            throw new HttpError("start 格式錯誤", 422);
        }

        if (!requiredNumberInRange(limit, 100, 1)) {
            throw new HttpError("limit 格式錯誤", 422);
        }

        const experience_model = new ExperienceModel(req.db);
        const total = await experience_model.getExperiencesCountByQuery(query);
        const experiences = await experience_model.getExperiences(query, sort, start, limit);

        res.send(generateGetExperiencesViewModel(experiences, total));
    })]
);
