const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const ObjectError = require('../../libs/errors').ObjectError;
const winston = require('winston');
const ExperienceService = require('../../services/experience_service');

/**
 * Get /experiences api
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

    const experience_service = new ExperienceService(req.db);
    experience_service.getExperiencesByQuery(req.query).then((result) => {
        result.experiences.map(modelMapToViewModel);
        res.send(result);
    }).catch((err) => {
        if (err instanceof ObjectError) {
            next(new HttpError(err.message, 422));
        } else {
            next(new HttpError("Internal Service Error", 500));
        }
    });
});

function modelMapToViewModel(experience) {
    const sections = experience.sections;
    experience.preview = sections[0].content;
    delete experience.sections;
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
