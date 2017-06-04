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
            type: "work",
            author_id: req.user._id,
            // company 後面決定
            company: {},
            like_count: 0,
            reply_count: 0,
            // TODO 瀏覽次數？檢舉數？
            created_at: new Date(),
        });
        Object.assign(experience, pickupWorkExperience(req.body));

        const experience_model = new ExperienceModel(req.db);

        helper.getCompanyByIdOrQuery(req.db, req.body.company_id, req.body.company_query).then(company => {
            experience.company = company;
        }).then(() => {
            return experience_model.createExperience(experience);
        }).then(() => {
            winston.info("work experiences insert data success", {
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
            winston.info("work experiences insert data fail", {
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
    validateWorkInputFields(data);
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

function validateWorkInputFields(data) {
    if (!data.is_currently_employed) {
        throw new HttpError("你現在在職嗎？", 422);
    }
    if (!shouldIn(data.is_currently_employed, ["yes", "no"])) {
        throw new HttpError('是否在職 yes or no', 422);
    }

    if (data.is_currently_employed === "no") {
        if (!data.job_ending_time) {
            throw new HttpError("離職年、月份要填喔！", 422);
        }
        if (!requiredNumber(data.job_ending_time.year)) {
            throw new HttpError("離職年份要填喔！", 422);
        }
        if (!requiredNumber(data.job_ending_time.month)) {
            throw new HttpError("離職月份要填喔！", 422);
        }
        const now = new Date();
        if (data.job_ending_time.year <= now.getFullYear() - 10) {
            throw new HttpError('離職年份需在10年內', 422);
        }
        if (data.job_ending_time.month < 1 || data.job_ending_time.month > 12) {
            throw new HttpError('離職月份需在1~12月', 422);
        }
        if ((data.job_ending_time.year === now.getFullYear() && data.job_ending_time.month > (now.getMonth() + 1)) ||
            data.job_ending_time.year > now.getFullYear()) {
            throw new HttpError('離職月份不可能比現在時間晚', 422);
        }
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

    if (data.week_work_time) {
        if (!requiredNumber(data.week_work_time)) {
            throw new HttpError("工時需為數字", 422);
        }
        if (data.week_work_time < 0 || data.week_work_time > 168) {
            throw new HttpError('工時需介於 0~168 之間', 422);
        }
    }

    if (data.recommend_to_others) {
        if (!shouldIn(data.recommend_to_others, ["yes", "no"])) {
            throw new HttpError("是否推薦此工作需為 yes or no", 422);
        }
    }
}

function pickupWorkExperience(input) {
    const partial = {};

    const {
        // common
        region,
        job_title,
        title,
        sections,
        experience_in_year,
        education,
        // work part
        is_currently_employed,
        job_ending_time,
        salary,
        week_work_time,
        recommend_to_others,
    } = input;

    Object.assign(partial, {
        region,
        job_title: job_title.toUpperCase(),
        title,
        sections,
        // experience_in_year optional
        // education optional
        is_currently_employed,
        job_ending_time,
        // salary optional
        // week_work_time optional
        // recommend_to_others optional
    });

    if (is_currently_employed === "yes") {
        const now = new Date();
        const data_time = {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
        };

        partial.data_time = data_time;
    } else {
        partial.data_time = job_ending_time;
    }
    if (experience_in_year) {
        partial.experience_in_year = experience_in_year;
    }
    if (education) {
        partial.education = education;
    }
    if (salary) {
        partial.salary = salary;
    }
    if (week_work_time) {
        partial.week_work_time = week_work_time;
    }
    if (recommend_to_others) {
        partial.recommend_to_others = recommend_to_others;
    }

    return partial;
}

module.exports = router;
