const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const winston = require('winston');
const ExperienceModel = require('../../models/experience_model');
const helper = require('../company_helper');
const authentication = require('../../middlewares/authentication');
const {
    requiredNonEmptyString,
    requiredNumber,
    optionalNumber,
    shouldIn,
    stringRequireLength,
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
        Object.assign(experience, {
            type: "interview",
            author: {
                id: req.user.facebook_id,
                type: 'facebook',
            },
            // company 後面決定
            company: {},
            like_count: 0,
            reply_count: 0,
            // TODO 瀏覽次數？檢舉數？
            created_at: new Date(),
        });
        Object.assign(experience, pickupInterviewExperience(req.body));

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
                experience: {
                    _id: experience._id,
                },
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
    if (!requiredNonEmptyString(data.company_query)) {
        throw new HttpError("公司/單位名稱要填喔！", 422);
    }

    if (!requiredNonEmptyString(data.region)) {
        throw new HttpError("地區要填喔！", 422);
    }
    if (!shouldIn(data.region, [
        '彰化縣',
        '嘉義市',
        '嘉義縣',
        '新竹市',
        '新竹縣',
        '花蓮縣',
        '高雄市',
        '基隆市',
        '金門縣',
        '連江縣',
        '苗栗縣',
        '南投縣',
        '新北市',
        '澎湖縣',
        '屏東縣',
        '臺中市',
        '臺南市',
        '臺北市',
        '臺東縣',
        '桃園市',
        '宜蘭縣',
        '雲林縣',
    ])) {
        throw new HttpError(`地區不允許 ${data.region}！`, 422);
    }

    if (!requiredNonEmptyString(data.job_title)) {
        throw new HttpError("職稱要填喔！", 422);
    }

    if (!requiredNonEmptyString(data.title)) {
        throw new HttpError("標題要寫喔！", 422);
    }
    if (!stringRequireLength(data.title, 1, 25)) {
        throw new HttpError("標題僅限 1~25 字！", 422);
    }

    if (!data.sections || !(data.sections instanceof Array)) {
        throw new HttpError("內容要寫喔！", 422);
    }
    data.sections.forEach((section) => {
        if (!requiredNonEmptyString(section.subtitle) || !requiredNonEmptyString(section.content)) {
            throw new HttpError("內容要寫喔！", 422);
        }
        if (!stringRequireLength(section.subtitle, 1, 25)) {
            throw new HttpError("內容標題僅限 1~25 字！", 422);
        }
        if (!stringRequireLength(section.content, 1, 5000)) {
            throw new HttpError("內容標題僅限 1~5000 字！", 422);
        }
    });

    if (!optionalNumber(data.experience_in_year)) {
        throw new HttpError("相關職務工作經驗是數字！", 422);
    }
    if (data.experience_in_year) {
        if (data.experience_in_year < 0 || data.experience_in_year > 50) {
            throw new HttpError("相關職務工作經驗需大於等於0，小於等於50", 422);
        }
    }

    if (data.education) {
        if (!shouldIn(data.education, ['大學', '碩士', '博士', '高職', '五專', '二專', '二技', '高中', '國中', '國小'])) {
            throw new HttpError("最高學歷範圍錯誤", 422);
        }
    }
}

function validateInterviewInputFields(data) {
    if (!data.interview_time) {
        throw new HttpError("面試時間要填喔！", 422);
    }
    if (!requiredNumber(data.interview_time.year)) {
        throw new HttpError("面試年份要填喔！", 422);
    }
    if (!requiredNumber(data.interview_time.month)) {
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
            if (!requiredNonEmptyString(qa.question) || !requiredNonEmptyString(qa.answer)) {
                throw new HttpError("面試題目內容要寫喔！", 422);
            }
            if (!stringRequireLength(qa.question, 1, 250)) {
                throw new HttpError("面試題目標題僅限 1~250 字！", 422);
            }
            if (!stringRequireLength(qa.answer, 1, 5000)) {
                throw new HttpError("面試題目標題僅限 1~5000 字！", 422);
            }
        });
        if (data.interview_qas.length > 30) {
            throw new HttpError("面試題目列表超過 30 題！", 422);
        }
    }

    if (!requiredNonEmptyString(data.interview_result)) {
        throw new HttpError("面試結果要填喔！", 422);
    }
    if (!stringRequireLength(data.interview_result, 1, 10)) {
        throw new HttpError("面試結果僅限 1~10 字！", 422);
    }

    // interview_sensitive_questions
    if (data.interview_sensitive_questions) {
        if (!(data.interview_sensitive_questions instanceof Array)) {
            throw new HttpError("面試中提及的特別問題要是一個陣列", 422);
        }
        data.interview_sensitive_questions.forEach((question) => {
            if (!requiredNonEmptyString(question)) {
                throw new HttpError("面試中提及的特別問題要是 string！", 422);
            }
            if (!stringRequireLength(question, 1, 20)) {
                throw new HttpError("面試中提及的特別問題僅限 1~20 字！", 422);
            }
        });
    }

    if (data.salary) {
        if (!shouldIn(data.salary.type, ["year", "month", "day", "hour"])) {
            throw new HttpError('薪資種類需為年薪/月薪/日薪/時薪', 422);
        }
        if (!requiredNumber(data.salary.amount)) {
            throw new HttpError('薪資需為數字', 422);
        }
        if (data.salary.amount < 0) {
            throw new HttpError('薪資不小於0', 422);
        }
    }

    if (!requiredNumber(data.overall_rating)) {
        throw new HttpError("這次面試你給幾分？", 422);
    }
    if (!shouldIn(data.overall_rating, [1, 2, 3, 4, 5])) {
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
