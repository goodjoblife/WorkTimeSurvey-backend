const HttpError = require('../libs/errors').HttpError;
const winston = require('winston');
const helper = require('./workings_helper');

/*
 * [req.custom.facebook]
 *
 * req.custom.working
 * req.custom.company_query
 */
function collectData(req, res) {
    const author = req.custom.author = {};
    const working = req.custom.working = {
        author: author,
        company: {},
        created_at: new Date(),
    };

    if (req.body.email && (typeof req.body.email === "string") && req.body.email !== "") {
        author.email = req.body.email;
    }

    if (req.custom.facebook) {
        author.id = req.custom.facebook.id,
        author.name = req.custom.facebook.name,
        author.type = "facebook";
    } else {
        author.id = "-1";
        author.type = "test";
    }

    // pick these fields only
    // make sure the field is string
    [
        "job_title", "week_work_time",
        "overtime_frequency",
        "day_promised_work_time", "day_real_work_time",
        "sector",
        "has_overtime_salary",
        "is_overtime_salary_legal",
        "has_compensatory_dayoff",
    ].forEach(function(field, i) {
        if (req.body[field] && (typeof req.body[field] === "string") && req.body[field] !== "") {
            working[field] = req.body[field];
        }
    });
    if (req.body.company_id && (typeof req.body.company_id === "string") && req.body.company_id !== "") {
        working.company.id = req.body.company_id;
    }
    if (req.body.company && (typeof req.body.company === "string") && req.body.company !== "") {
        req.custom.company_query = req.body.company;
    }

    return Promise.resolve();
}

function validation(req, res) {
    const data = req.custom.working;
    const company_query = req.custom.company_query;

    /*
     * Check all the required fields, or raise an 422 http error
     */
    try {
        if (! data.job_title) {
            throw new HttpError("職稱未填", 422);
        }

        if (! data.week_work_time) {
            throw new HttpError("最近一週實際工時未填", 422);
        }
        data.week_work_time = parseFloat(data.week_work_time);
        if (isNaN(data.week_work_time)) {
            throw new HttpError("最近一週實際工時必須是數字", 422);
        }
        if (data.week_work_time < 0 || data.week_work_time > 168) {
            throw new HttpError("最近一週實際工時必須在0~168之間", 422);
        }

        if (! data.overtime_frequency) {
            throw new HttpError("加班頻率必填", 422);
        }
        if (["0", "1", "2", "3"].indexOf(data.overtime_frequency) === -1) {
            throw new HttpError("加班頻率格式錯誤", 422);
        }
        data.overtime_frequency = parseInt(data.overtime_frequency);

        if (! data.day_promised_work_time) {
            throw new HttpError("工作日表訂工時未填", 422);
        }
        data.day_promised_work_time = parseFloat(data.day_promised_work_time);
        if (isNaN(data.day_promised_work_time)) {
            throw new HttpError("工作日表訂工時必須是數字", 422);
        }
        if (data.day_promised_work_time < 0 || data.day_promised_work_time > 24) {
            throw new HttpError("工作日表訂工時必須在0~24之間", 422);
        }

        if (! data.day_real_work_time) {
            throw new HttpError("工作日實際工時必填", 422);
        }
        data.day_real_work_time = parseFloat(data.day_real_work_time);
        if (isNaN(data.day_real_work_time)) {
            throw new HttpError("工作日實際工時必須是數字", 422);
        }
        if (data.day_real_work_time < 0 || data.day_real_work_time > 24) {
            throw new HttpError("工作日實際工時必須在0~24之間", 422);
        }

        if (! data.company.id) {
            if (! company_query) {
                throw new HttpError("公司/單位名稱必填", 422);
            }
        }

        if (data.has_overtime_salary) {
            if (["yes", "no", "don't know"].indexOf(data.has_overtime_salary) === -1) {
                throw new HttpError('加班是否有加班費應為是/否/不知道', 422);
            }
        }

        if (data.is_overtime_salary_legal) {
            if (data.has_overtime_salary) {
                if (data.has_overtime_salary !== "yes") {
                    throw new HttpError('加班應有加班費，本欄位才有意義', 422);
                } else {
                    if (["yes", "no", "don't know"].indexOf(data.is_overtime_salary_legal) === -1) {
                        throw new HttpError('加班費是否合法應為是/否/不知道', 422);
                    }
                }
            } else {
                throw new HttpError('加班應有加班費，本欄位才有意義', 422);
            }
        }

        if (data.has_compensatory_dayoff) {
            if (["yes", "no", "don't know"].indexOf(data.has_compensatory_dayoff) === -1) {
                throw new HttpError('加班是否有補修應為是/否/不知道', 422);
            }
        }

        return Promise.resolve();
    } catch (err) {
        winston.info("validating fail", {ip: req.ip, ips: req.ips});

        return Promise.reject(err);
    }
}

function main(req, res, next) {
    const working = req.custom.working;
    const company_query = req.custom.company_query;
    const response_data = {
        working: working,
    };

    /*
     * Normalize the data
     */
    working.job_title = working.job_title.toUpperCase();

    const collection = req.db.collection("workings");

    /*
     * 如果使用者有給定 company id，將 company name 補成查詢到的公司
     *
     * 如果使用者是給定 company name，如果只找到一間公司，才補上 id
     *
     * 其他情況看 issue #7
     */
    helper.normalizeCompany(req.db, working.company.id, company_query).then(company => {
        working.company = company;
    }).then(() => {
        const author = working.author;

        return helper.checkAndUpdateQuota(req.db, {id: author.id, type: author.type}).then(queries_count => {
            response_data.queries_count = queries_count;
        });
    }).then(() => {
        return collection.insert(working);
    }).then(() => {
        winston.info("workings insert data success", {id: working._id, ip: req.ip, ips: req.ips});

        res.send(response_data);
    }).catch(function(err) {
        winston.info("workings insert data fail", {id: working._id, ip: req.ip, ips: req.ips, err: err});

        next(err);
    });
}

module.exports = {
    collectData,
    validation,
    main,
};
