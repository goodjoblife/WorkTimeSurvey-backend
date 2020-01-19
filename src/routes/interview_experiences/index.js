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

function pickupInterviewExperience(input) {
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
        // interview part
        interview_time,
        interview_qas,
        interview_result,
        interview_sensitive_questions,
        overall_rating,
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
        interview_time,
        interview_qas,
        interview_result,
        interview_sensitive_questions,
        salary,
        overall_rating,
    };
}

/**
 * @api {post} /interview_experiences 上傳面試經驗 API
 * @apiGroup Interview_Experiences
 * @apiParam {String} company_query 公司名稱 或 統一編號
 * @apiParam {String} [company_id] 公司統編 (如果自動完成有成功，會拿的到 company_id )
 * @apiParam {String=
    "彰化縣","嘉義市","嘉義縣","新竹市","新竹縣",
    "花蓮縣","高雄市","基隆市","金門縣","連江縣",
    "苗栗縣","南投縣","新北市","澎湖縣","屏東縣",
    "臺中市","臺南市","臺北市","臺東縣","桃園市",
    "宜蘭縣","雲林縣" } region 面試地區
 * @apiParam {String} job_title 應徵職稱
 * @apiParam {String="0 < length <= 50 "} title 整篇經驗分享的標題
 * @apiParam {Number="整數, 0 <= N <= 50"} [experience_in_year] 相關職務工作經驗
 * @apiParam {String="大學","碩士","博士","高職","五專","二專","二技","高中","國中","國小"} [education] 最高學歷
 * @apiParam {Object} interview_time 面試時間
 * @apiParam {Number="整數, N >= current_year - 10"} interview_time.year 面試時間的年份
 * @apiParam {Number="1,2,3...12"} interview_time.month 面試時間的月份
 * @apiParam {String="錄取,未錄取,沒通知,或其他 0 < length <= 100 的字串"} interview_result 面試結果
 * @apiParam {Object} [salary] 面談薪資
 * @apiParam {String="year","month","day","hour"} salary.type 面談薪資種類 (若有上傳面談薪資欄位，本欄必填)
 * @apiParam {Number="整數, >= 0"} salary.amount 面談薪資金額 (若有上傳面談薪資欄位，本欄必填)
 * @apiParam {Number="整數, 1~5"} overall_rating 整體面試滿意度
 * @apiParam {Object[]} sections 整篇內容
 * @apiParam {String="0 < length <= 25" || NULL} sections.subtitle 段落標題
 * @apiParam {String="0 < length <= 5000"} sections.content 段落內容
 * @apiParam {Object[]="Array maximum size: 30"} [interview_qas] 面試題目列表
 * @apiParam {String="0 < length <= 250"} interview_qas.question 面試題目 (interview_qas有的話，必填)
 * @apiParam {String="0 < length <= 5000"} [interview_qas.answer] 面試題目的回答 (interview_qas有的話，選填)
 * @apiParam {String[]=
    "曾詢問家庭狀況","曾詢問婚姻狀況","生育計畫",
    "曾要求繳交身分證","曾要求繳交保證金","曾詢問宗教信仰",
    "或其他 0 < length <= 20 的字串"} [interview_sensitive_questions] 面試中提及的特別問題陣列(較敏感/可能違法)
 * @apiParam {String} [email] 使用者訂閱資訊的 email
 * @apiParam {String="published","hidden"} [status="published"] 該篇文章的狀態
 * @apiSuccess {Boolean} success 是否上傳成功
 * @apiSuccess {Object} experience 經驗分享物件
 * @apiSuccess {String} experience._id 經驗分享id
 */
router.post("/", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const experience = pickupInterviewExperience(req.body);

        const query = /* GraphQL */ `
            mutation CreateInterviewExperience(
                $input: CreateInterviewExperienceInput!
            ) {
                createInterviewExperience(input: $input) {
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

        const { createInterviewExperience } = data;

        res.send({
            success: createInterviewExperience.success,
            experience: {
                _id: createInterviewExperience.experience.id,
            },
        });
    }),
]);

module.exports = router;
