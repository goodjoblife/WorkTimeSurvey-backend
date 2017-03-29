const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const winston = require('winston');
const helper = require('./workings_helper');

router.post('/', function(req, res, next) {
    const data_fields = [
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

    req.custom = {};
    req.custom.experience = {
        author: {},
        company: {},
        created_at: new Date(),
        type: "interview",
    };

    collectExperienceData(req, data_fields).then(next, next);
}, function(req, res, next) {
    validation(req).then(next, next);
}, main);


function collectExperienceData(req, fields) {
    const experience = req.custom.experience;

    // pick fields only
    // make sure the field is string
    fields.forEach((field) => {
        if (checkBodyField(req, field)) {
            experience[field] = req.body[field];
        }
    });

    if (checkBodyField(req, "company_id")) {
        experience.company.id = req.body.company_id;
    } else if (checkBodyField(req, "company")) {
        experience.company.query = req.body.company;
    }

    return Promise.resolve();
}

function validation(req) {
    const experience = req.custom.experience;

    try {
        validateCommonData(experience);
        if (experience.type === "interview") {
            validateInterviewData(experience);
        } else if (experience.type === "work") {
            validateWorkData(experience);
        }
    } catch (err) {
        winston.info("validating fail", {ip: req.ip, ips: req.ips});

        return Promise.reject(err);
    }

    return Promise.resolve();
}

function validateCommonData(data) {
    /*
    if (! data.author) {
        throw new HttpError("使用者沒登入嗎？", 500);
    }
    */
    if (! data.company.id && ! data.company.query) {
        throw new HttpError("公司/單位名稱要填喔！", 422);
    }
    if (! data.area) {
        throw new HttpError("地區要填喔！", 422);
    }
    if (! data.job_title) {
        throw new HttpError("職稱要填喔！", 422);
    }
    if (! data.title) {
        throw new HttpError("標題要寫喔！", 422);
    }
}

function validateInterviewData(data) {

    // Required
    if (! data.interview_time_year) {
        throw new HttpError("面試年份要填喔！", 422);
    } else if (! data.interview_time_month) {
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

    if (! data.interview_result) {
        throw new HttpError("面試結果要填喔！", 422);
    }

    if (! data.overall_rating) {
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

function checkBodyField(req, field) {
    if (req.body[field] && (typeof req.body[field] === "string") && req.body[field] !== "") {
        return true;
    } else {
        return false;
    }
}

function main(req, res, next) {
    const experience = req.custom.experience;
    const response_data = {
        experience: experience,
    };
    const collection = req.db.collection("experiences");

    /*
     * Normalize the data
     */
    experience.job_title = experience.job_title.toUpperCase();

    /*
     *  這邊處理需要呼叫async函數的部份
     */
    /*
     * 如果使用者有給定 company id，將 company name 補成查詢到的公司
     *
     * 如果使用者是給定 company name，如果只找到一間公司，才補上 id
     *
     * 其他情況看 issue #7
     */
    helper.normalizeCompany(req.db, experience.company.id, experience.company.query).then(company => {
        experience.company = company;

        return collection.insert(experience);
    }).then(() => {
        winston.info("experiences insert data success", {id: experience._id, ip: req.ip, ips: req.ips});

        res.send(response_data);
    }).catch(err => {
        winston.info("experiences insert data fail", {id: experience._id, ip: req.ip, ips: req.ips, err: err});

        next(err);
    });
}

module.exports = router;
