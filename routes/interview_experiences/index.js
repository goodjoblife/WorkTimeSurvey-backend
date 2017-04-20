const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const winston = require('winston');
const ExperienceModel = require('../../models/experience_model');
const helper = require('../company_helper');
const authentication = require('../../middlewares/authentication');
const {
    required_non_empty_string,
    required_number,
    optional_number,
    should_in,
} = require('../../libs/validation');

/**
 * Post /interview_experiences
 * @param {object} req.body
 *  - {
 *  company_query : "1111",
 *  company_id : "123456",
 *  region : "台北市",
 *  job_title : "BackEnd Developer",
 *  experience_in_year : "10",
 *  education : "碩士",
 *  interview_time_year : "2016",
 *  interview_time_month : "12",
 *  interview_result : "錄取",
 *  salary_amoount : "year",
 *  overall_rating : "5",
 *  sections : [
 *      { subtitle:"hello" , content : "test" }
 *  ],
 *  interview_qas : [
 *      { querstion : "what you name?" , answer : "you father"}
 *  ],
 *  interview_sensitive_questions : [
 *      "what your name ?"
 *  ]
 *
 *  }
 *
 * @returns {object}
 *  - {
 *      success : true
 *  }
 */
router.post('/', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        try {
            validationInputFields(req.body);
        } catch (err) {
            next(err);
            return;
        }

        const experience = {};
        experience.type = "interview";
        experience.author = {
            id: req.user.id,
            type: req.user.type,
        };
        experience.company = {};
        Object.assign(experience, pickupInterviewExperience(req.body));
        experience.created_at = new Date();

        const experience_model = new ExperienceModel(req.db);

        helper.getCompanyByIdOrQuery(req.db, req.body.company_id, req.body.company_query).then(company => {
            experience.company = company;
        }).then(() => {
            return experience_model.createExperience(experience);
        }).then(() => {
            winston.info("experiences insert data success", {
                id: experience._id,
                ip: req.ip,
                ips: req.ips,
            });

            res.send({
                success: true,
            });
        }).catch(err => {
            winston.info("experiences insert data fail", {
                id: experience._id,
                ip: req.ip,
                ips: req.ips,
                err: err,
            });

            next(err);
        });
    },
]);

function validationInputFields(data) {
    validateCommonInputFields(data);
    validateInterviewInputFields(data);
}

function validateCommonInputFields(data) {
    if (!required_non_empty_string(data.company_query)) {
        throw new HttpError("公司/單位名稱要填喔！", 422);
    }
    if (!required_non_empty_string(data.region)) {
        throw new HttpError("地區要填喔！", 422);
    }
    if (!required_non_empty_string(data.job_title)) {
        throw new HttpError("職稱要填喔！", 422);
    }
    if (!required_non_empty_string(data.title)) {
        throw new HttpError("標題要寫喔！", 422);
    }
    if (!data.sections || !(data.sections instanceof Array)) {
        throw new HttpError("內容要寫喔！", 422);
    }
    data.sections.forEach((section) => {
        if (!required_non_empty_string(section.subtitle) || !required_non_empty_string(section.content)) {
            throw new HttpError("內容要寫喔！", 422);
        }
    });
    if (!optional_number(data.experience_in_year)) {
        throw new HttpError("相關職務工作經驗是數字！", 422);
    }
    if (data.experience_in_year) {
        if (data.experience_in_year < 0 || data.experience_in_year > 50) {
            throw new HttpError("相關職務工作經驗需大於等於0，小於等於50", 422);
        }
    }
    if (data.education) {
        if (!should_in(data.education, ['大學', '碩士', '博士', '高職', '五專', '二專', '二技', '高中', '國中', '國小'])) {
            throw new HttpError("最高學歷範圍錯誤", 422);
        }
    }
}

function validateInterviewInputFields(data) {
    if (!data.interview_time) {
        throw new HttpError("面試時間要填喔！", 422);
    }
    if (!required_number(data.interview_time.year)) {
        throw new HttpError("面試年份要填喔！", 422);
    }
    if (!required_number(data.interview_time.month)) {
        throw new HttpError("面試月份要填喔！", 422);
    }
    const now = new Date();
    if (data.interview_time.year <= now.getFullYear() - 10) {
        throw new HttpError('面試年份需在10年內', 422);
    }
    if (data.interview_time.month < 1 || data.interview_time.month > 12) {
        throw new HttpError('面試月份需在1~12月', 422);
    }
    if ((data.interview_time.year === now.getFullYear() && data.interview_time.month > (now.getMonth() + 1)) ||
        data.interview_time.year > now.getFullYear()) {
        throw new HttpError('面試月份不可能比現在時間晚', 422);
    }

    if (data.interview_qas) {
        if (!(data.interview_qas instanceof Array)) {
            throw new HttpError("面試題目列表要是一個陣列", 422);
        }
        data.interview_qas.forEach((qa) => {
            if (!required_non_empty_string(qa.question) || !required_non_empty_string(qa.answer)) {
                throw new HttpError("內容要寫喔！", 422);
            }
        });
        if (data.interview_qas.length > 30) {
            throw new HttpError("面試題目列表超過 30 題！", 422);
        }
    }

    if (!required_non_empty_string(data.interview_result)) {
        throw new HttpError("面試結果要填喔！", 422);
    }

    // interview_sensitive_questions
    if (data.interview_sensitive_questions) {
        if (!(data.interview_sensitive_questions instanceof Array)) {
            throw new HttpError("面試中提及的特別問題要是一個陣列", 422);
        }
        data.interview_sensitive_questions.forEach((question) => {
            if (!required_non_empty_string(question)) {
                throw new HttpError("面試中提及的特別問題要是 string！", 422);
            }
        });
    }

    if (data.salary) {
        if (!should_in(data.salary.type, ["year", "month", "day", "hour"])) {
            throw new HttpError('薪資種類需為年薪/月薪/日薪/時薪', 422);
        }
        if (!required_number(data.salary.amount)) {
            throw new HttpError('薪資需為數字', 422);
        }
        if (data.salary.amount < 0) {
            throw new HttpError('薪資不小於0', 422);
        }
    }

    if (!required_number(data.overall_rating)) {
        throw new HttpError("這次面試你給幾分？", 422);
    }

    if (!should_in(data.overall_rating, [1, 2, 3, 4, 5])) {
        throw new HttpError('面試分數有誤', 422);
    }
}

function pickupInterviewExperience(input) {
    const partial = {};

    const {
        // common
        region,
        job_title,
        title,
        sections,
        experience_in_year,
        education,
        // interview part
        interview_time,
        interview_qas,
        interview_result,
        interview_sensitive_questions,
        salary,
        overall_rating,
    } = input;

    Object.assign(partial, {
        region,
        job_title: job_title.toUpperCase(),
        title,
        sections,
        // experience_in_year optional
        // education optional
        interview_time,
        // interview_qas optional
        interview_result,
        // interview_sensitive_questions optional
        // salary optional
        overall_rating,
    });

    if (experience_in_year) {
        partial.experience_in_year = experience_in_year;
    }
    if (education) {
        partial.education = education;
    }
    if (interview_qas) {
        partial.interview_qas = interview_qas;
    } else {
        partial.interview_qas = [];
    }
    if (interview_sensitive_questions) {
        partial.interview_sensitive_questions = interview_sensitive_questions;
    } else {
        partial.interview_sensitive_questions = [];
    }
    if (salary) {
        partial.salary = salary;
    }
    return partial;
}

module.exports = router;
