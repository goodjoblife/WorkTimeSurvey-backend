const express = require("express");
const { makeExecutableSchema } = require("graphql-tools");
const { graphql } = require("graphql");

const router = express.Router();
const { HttpError } = require("../../libs/errors");
const helper = require("../company_helper");
const {
    requiredNonEmptyString,
    requiredNumber,
    optionalNumber,
    shouldIn,
    stringRequireLength,
    validateEmail,
} = require("../../libs/validation");
const wrap = require("../../libs/wrap");
const {
    requireUserAuthetication,
} = require("../../middlewares/authentication");

const resolvers = require("../../schema/resolvers");
const typeDefs = require("../../schema/typeDefs");

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

function validateCommonInputFields(data) {
    if (!requiredNonEmptyString(data.company_query)) {
        throw new HttpError("公司/單位名稱要填喔！", 422);
    }

    if (!requiredNonEmptyString(data.region)) {
        throw new HttpError("地區要填喔！", 422);
    }
    if (
        !shouldIn(data.region, [
            "彰化縣",
            "嘉義市",
            "嘉義縣",
            "新竹市",
            "新竹縣",
            "花蓮縣",
            "高雄市",
            "基隆市",
            "金門縣",
            "連江縣",
            "苗栗縣",
            "南投縣",
            "新北市",
            "澎湖縣",
            "屏東縣",
            "臺中市",
            "臺南市",
            "臺北市",
            "臺東縣",
            "桃園市",
            "宜蘭縣",
            "雲林縣",
        ])
    ) {
        throw new HttpError(`地區不允許 ${data.region}！`, 422);
    }

    if (!requiredNonEmptyString(data.job_title)) {
        throw new HttpError("職稱要填喔！", 422);
    }

    if (!requiredNonEmptyString(data.title)) {
        throw new HttpError("標題要寫喔！", 422);
    }
    if (!stringRequireLength(data.title, 1, 50)) {
        throw new HttpError("標題僅限 1~50 字！", 422);
    }

    if (!data.sections || !(data.sections instanceof Array)) {
        throw new HttpError("內容要寫喔！", 422);
    }
    data.sections.forEach(section => {
        if (!requiredNonEmptyString(section.content)) {
            throw new HttpError("內容要寫喔！", 422);
        }
        if (
            section.subtitle !== null &&
            !stringRequireLength(section.subtitle, 1, 25)
        ) {
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
        if (
            !shouldIn(data.education, [
                "大學",
                "碩士",
                "博士",
                "高職",
                "五專",
                "二專",
                "二技",
                "高中",
                "國中",
                "國小",
            ])
        ) {
            throw new HttpError("最高學歷範圍錯誤", 422);
        }
    }

    if (data.email && !validateEmail(data.email)) {
        throw new HttpError("E-mail 格式錯誤", 422);
    }

    if (data.salary) {
        if (!shouldIn(data.salary.type, ["year", "month", "day", "hour"])) {
            throw new HttpError("薪資種類需為年薪/月薪/日薪/時薪", 422);
        }
        if (!requiredNumber(data.salary.amount)) {
            throw new HttpError("薪資需為數字", 422);
        }
        if (data.salary.amount < 0) {
            throw new HttpError("薪資不小於0", 422);
        }
    }
}

function validateWorkInputFields(data) {
    if (!data.is_currently_employed) {
        throw new HttpError("你現在在職嗎？", 422);
    }
    if (!shouldIn(data.is_currently_employed, ["yes", "no"])) {
        throw new HttpError("是否在職 yes or no", 422);
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
            throw new HttpError("離職年份需在10年內", 422);
        }
        if (data.job_ending_time.month < 1 || data.job_ending_time.month > 12) {
            throw new HttpError("離職月份需在1~12月", 422);
        }
        if (
            (data.job_ending_time.year === now.getFullYear() &&
                data.job_ending_time.month > now.getMonth() + 1) ||
            data.job_ending_time.year > now.getFullYear()
        ) {
            throw new HttpError("離職月份不可能比現在時間晚", 422);
        }
    }

    if (data.week_work_time) {
        if (!requiredNumber(data.week_work_time)) {
            throw new HttpError("工時需為數字", 422);
        }
        if (data.week_work_time < 0 || data.week_work_time > 168) {
            throw new HttpError("工時需介於 0~168 之間", 422);
        }
    }

    if (data.recommend_to_others) {
        if (!shouldIn(data.recommend_to_others, ["yes", "no"])) {
            throw new HttpError("是否推薦此工作需為 yes or no", 422);
        }
    }
}

function validationInputFields(data) {
    validateCommonInputFields(data);
    validateWorkInputFields(data);
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
        status,
        email,
        salary,
        // work part
        is_currently_employed,
        job_ending_time,
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

    if (status) {
        partial.status = status;
    } else {
        partial.status = "published";
    }

    if (email) {
        partial.email = email;
    }

    return partial;
}

/**
 * @api {post} /work_experiences 上傳工作經驗 API
 * @apiGroup Work_Experiences
 * @apiParam {String} company_query 公司名稱 或 統一編號
 * @apiParam {String} [company_id] 公司統編 (如果自動完成有成功，會拿的到 company_id )
 * @apiParam {String=
    "彰化縣","嘉義市","嘉義縣","新竹市","新竹縣",
    "花蓮縣","高雄市","基隆市","金門縣","連江縣",
    "苗栗縣","南投縣","新北市","澎湖縣","屏東縣",
    "臺中市","臺南市","臺北市","臺東縣","桃園市",
    "宜蘭縣","雲林縣" } region 面試地區
 * @apiParam {String} job_title 工作職稱
 * @apiParam {String="0 < length <= 50 "} title 整篇經驗分享的標題
 * @apiParam {Number="整數, 0 <= N <= 50"} [experience_in_year] 相關職務工作經驗
 * @apiParam {String="大學","碩士","博士","高職","五專","二專","二技","高中","國中","國小" } [education] 最高學歷
 * @apiParam {String="yes","no"} is_currently_employed 現在是否在職
 * @apiParam {Object} job_ending_time 工作結束時間(當 is_currently_employed 為no時，本欄才會出現且必填)
 * @apiParam {Number="整數, Ｎ >= current_year - 10"} job_ending_time.year 工作結束時間的年份
 * @apiParam {Number="整數, 1~12"} job_ending_time.month 工作結束時間的月份
 * @apiParam {Object} [salary] 薪資
 * @apiParam {String="year","month","day","hour"} salary.type 薪資種類 (若有上傳薪資欄位，本欄必填)
 * @apiParam {Number="整數, >= 0"} salary.amount 薪資金額 (若有上傳薪資欄位，本欄必填)
 * @apiParam {Number="整數或浮點數。 168>=N>=0。"} [week_work_time] 一週工時
 * @apiParam {String="yes","no"} [recommend_to_others] 是否推薦此工作
 * @apiParam {Object[]} sections 整篇內容
 * @apiParam {String="0 < length <= 25" || NULL} sections.subtitle 段落標題
 * @apiParam {String="0 < length <= 5000"} sections.content 段落內容
 * @apiParam {String="published","hidden"} [status="published"] 該篇文章的狀態
 * @apiParam {String} email 電子郵件
 * @apiSuccess {Boolean} success 是否上傳成功
 * @apiSuccess {Object} experience 經驗分享物件
 * @apiSuccess {String} experience._id 經驗分享id
 */
router.post("/", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        validationInputFields(req.body);

        const experience = {
            company: {},
        };
        Object.assign(experience, pickupWorkExperience(req.body));

        const company_model = req.manager.CompanyModel;

        const company = await helper.getCompanyByIdOrQuery(
            company_model,
            req.body.company_id,
            req.body.company_query
        );
        experience.company = company;

        const query = /* GraphQL */ `
            mutation CreateWorkExperience($input: CreateWorkExperienceInput!) {
                createWorkExperience(input: $input) {
                    success
                    experience {
                        id
                    }
                }
            }
        `;

        const input = {
            input: experience,
        };

        const {
            data: { createWorkExperience },
        } = await graphql(schema, query, null, req, input);

        res.send({
            success: createWorkExperience.success,
            experience: {
                _id: createWorkExperience.experience.id,
            },
        });
    }),
]);

module.exports = router;
