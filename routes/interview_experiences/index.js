const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const winston = require('winston');
const WorkService = require('../../services/work_service');
const ExperienceService = require('../../services/experience_service');
const authentication = require('../../middlewares/authentication');
//const helper = require('./workings_helper');

router.post('/', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {

        const experience = req.body;
        experience.type = "interview";
        experience.company = {};
        experience.author = {};
        checkExperienceField(experience);
        let valid_result = validation(experience, req);
        if (!valid_result.result) {
            next(valid_result.err);
            return;
        }

        const experience_service = new ExperienceService(req.db);
        experience.job_title = experience.job_title.toUpperCase();

        _normalizeCompany(req.db, experience.company.id, experience.company.query).then(company => {
            experience.company = company;
            experience.author = {
                id: req.user.id,
                type: req.user.type,
            };
            experience.created_at = new Date();
            return experience_service.createExperience(experience);
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



/**
 * 檢查experience的field，是否屬於default field，不是則刪除
 *
 * @param experience
 * @returns {undefined}
 */
function checkExperienceField(experience) {

    const Default_FIELDS = [
        // Required
        "author_id",
        "author_type",
        "area",
        "job_title",
        "interview_time_year",
        "interview_time_month",
        "interview_result",
        "overall_rating",
        "title",
        // Optional
        "sections",
        "interview_qas",
        "experience_in_year",
        "education",
        "salary_type",
        "salary_amount",
    ];
    // pick fields only
    // make sure the field is string
    Default_FIELDS.forEach((field) => {
        if (!_checkField(experience, field)) {
            delete experience[field];
        }
    });

    if (_checkField(experience, "company_id")) {
        experience.company.id = experience.company_id;
    } else if (_checkField(experience, "company")) {
        experience.company.query = experience.company;
    }
}

function _checkField(data, field) {
    if (data[field] && (typeof data[field] === "string") && data[field] !== "") {
        return true;
    } else {
        return false;
    }
}

function validation(experience, req) {

    try {
        validateCommonData(experience);
        if (experience.type === "interview") {
            validateInterviewData(experience);
        } else if (experience.type === "work") {
            validateWorkData(experience);
        }
    } catch (err) {
        winston.info("validating fail", {
            ip: req.ip,
            ips: req.ips,
        });
        return {
            result: false,
            err: err,
        };
    }
    return {
        result: true,
    };
}

function validateCommonData(data) {
    /*
    if (! data.author) {
        throw new HttpError("使用者沒登入嗎？", 500);
    }
    */
    if (!data.company.id && !data.company.query) {
        throw new HttpError("公司/單位名稱要填喔！", 422);
    }
    if (!data.area) {
        throw new HttpError("地區要填喔！", 422);
    }
    if (!data.job_title) {
        throw new HttpError("職稱要填喔！", 422);
    }
    if (!data.title) {
        throw new HttpError("標題要寫喔！", 422);
    }
}

function validateInterviewData(data) {

    // Required
    if (!data.interview_time_year) {
        throw new HttpError("面試年份要填喔！", 422);
    } else if (!data.interview_time_month) {
        throw new HttpError("面試月份要填喔！", 422);
    } else {
        data.interview_time = {
            year: parseInt(data.interview_time_year),
            month: parseInt(data.interview_time_month),
        };
        delete data.interview_time_year;
        delete data.interview_time_month;

        const now = new Date();
        if (isNaN(data.interview_time.year)) {
            throw new HttpError('面試年份需為數字', 422);
        } else if (data.interview_time.year <= now.getFullYear() - 10) {
            throw new HttpError('面試年份需在10年內', 422);
        }
        if (isNaN(data.interview_time.month)) {
            throw new HttpError('面試月份需為數字', 422);
        } else if (data.interview_time.month < 1 || data.interview_time.month > 12) {
            throw new HttpError('面試月份需在1~12月', 422);
        }
        if ((data.interview_time.year === now.getFullYear() && data.interview_time.month > (now.getMonth() + 1)) ||
            data.interview_time.year > now.getFullYear()) {
            throw new HttpError('面試月份不可能比現在時間晚', 422);
        }
    }

    if (!data.interview_result) {
        throw new HttpError("面試結果要填喔！", 422);
    }

    if (!data.overall_rating) {
        throw new HttpError("這次面試你給幾分？", 422);
    } else if (["1", "2", "3", "4", "5"].indexOf(data.overall_rating) === -1) {
        throw new HttpError('面試分數有誤', 422);
    }

    // Optional
    if (data.experience_in_year) {
        data.experience_in_year = parseInt(data.experience_in_year);
        if (isNaN(data.experience_in_year)) {
            throw new HttpError('相關職務工作經驗需為數字', 422);
        } else if (data.experience_in_year < 0 || data.experience_in_year > 50) {
            throw new HttpError('相關職務工作經驗需大於等於0，小於等於50', 422);
        }
    }

    if (data.education) {
        // todo
    }

    if (data.salary_amount && data.salary_type) {
        data.salary = {
            amount: parseInt(data.salary_amount),
            type: data.salary_type,
        };

        delete data.salary_amount;
        delete data.salary_type;

        if (["year", "month", "day", "hour"].indexOf(data.salary.type) === -1) {
            throw new HttpError('薪資種類需為年薪/月薪/日薪/時薪', 422);
        }
        if (isNaN(data.salary.amount)) {
            throw new HttpError('薪資需為數字', 422);
        } else if (data.salary.amount < 0) {
            throw new HttpError('薪資不小於0', 422);
        }
    }
}

function validateWorkData(data) {
    //todo
}

/*
 * 如果使用者有給定 company id，將 company name 補成查詢到的公司
 *
 * 如果使用者是給定 company query，如果只找到一間公司，才補上 id
 *
 * 其他情況看 issue #7
 */
function _normalizeCompany(db, company_id, company_query) {
    const work_service = new WorkService(db);

    if (company_id) {
        return work_service.searchCompanyById(company_id).then(results => {
            if (results.length === 0) {
                throw new HttpError("公司統編不正確", 422);
            }

            return {
                id: company_id,
                name: results[0].name,
            };
        });
    } else {
        return work_service.searchCompanyById(company_query).then(results => {
            if (results.length === 0) {
                return this.searchCompanyByName(company_query.toUpperCase()).then(results => {
                    if (results.length === 1) {
                        return {
                            id: results[0].id,
                            name: results[0].name,
                        };
                    } else {
                        return {
                            name: company_query.toUpperCase(),
                        };
                    }
                });
            } else {
                return {
                    id: results[0].id,
                    name: results[0].name,
                };
            }
        });
    }
}

module.exports = router;
