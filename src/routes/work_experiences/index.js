const express = require("express");
const { makeExecutableSchema } = require("graphql-tools");
const { graphql } = require("graphql");

const router = express.Router();
const { HttpError } = require("../../libs/errors");
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

function pickupWorkExperience(input) {
    const {
        // common
        company_id,
        company_query,
        region,
        job_title,
        title,
        sections,
        experience_in_year,
        education,
        email,
        salary,
        // work part
        is_currently_employed,
        job_ending_time,
        week_work_time,
        recommend_to_others,
    } = input;

    return {
        company: {
            id: company_id,
            query: company_query,
        },
        region,
        job_title,
        title,
        sections,
        experience_in_year,
        education,
        email,
        is_currently_employed,
        job_ending_time,
        salary,
        week_work_time,
        recommend_to_others,
    };
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
        const experience = pickupWorkExperience(req.body);

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

        const { data, errors } = await graphql(schema, query, null, req, input);

        if (errors) {
            // FIXME: the reason of why all throw errors 422 is doesn't want to break frontend API
            throw new HttpError(errors, 422);
        }

        const { createWorkExperience } = data;

        res.send({
            success: createWorkExperience.success,
            experience: {
                _id: createWorkExperience.experience.id,
            },
        });
    }),
]);

module.exports = router;
