const R = require("ramda");
const { combineSelector } = require("../../view_models/helper");
const wrap = require("../../libs/wrap");
const helper = require("./helper");
const companyHelper = require("../company_helper");
const recommendation = require("../../libs/recommendation");
const { HttpError, ObjectIdError } = require("../../libs/errors");
const { requiredNonEmptyString, shouldIn } = require("../../libs/validation");

const toInt = x => parseInt(x, 10);
const toFloat = x => parseFloat(x, 10);

const jobTitleSelector = body => ({
    job_title: body.job_title.toUpperCase(),
});

// body => common fields
const commonFieldsSelector = combineSelector([
    // 必要欄位
    jobTitleSelector,
    R.pick(["is_currently_employed", "employment_type"]),
    // 可選欄位，"" 空白不取
    R.pipe(R.pick(["sector", "gender"]), R.filter(v => v !== "")),
    // optional
    body => {
        if (body.job_ending_time_year && body.job_ending_time_month) {
            return {
                job_ending_time: {
                    year: toInt(body.job_ending_time_year),
                    month: toInt(body.job_ending_time_month),
                },
            };
        }
        return {};
    },
    // optional with default value
    body => {
        if (body.status) {
            return { status: body.status };
        }
        return { status: "published" };
    },
]);

const workingTimeFieldsSeletor = combineSelector([
    body => ({
        week_work_time: toFloat(body.week_work_time),
        overtime_frequency: toInt(body.overtime_frequency),
        day_promised_work_time: toFloat(body.day_promised_work_time),
        day_real_work_time: toFloat(body.day_real_work_time),
    }),
    R.pipe(
        R.pick([
            "has_overtime_salary",
            "is_overtime_salary_legal",
            "has_compensatory_dayoff",
        ]),
        R.filter(v => v !== "")
    ),
]);

const salaryFeildsSelector = combineSelector([
    body => ({
        experience_in_year: toInt(body.experience_in_year),
        salary: {
            type: body.salary_type,
            amount: toInt(body.salary_amount),
        },
    }),
]);

const hasWorkingTimeFields = body => {
    if (
        body.week_work_time ||
        body.overtime_frequency ||
        body.day_promised_work_time ||
        body.day_real_work_time ||
        body.has_overtime_salary ||
        body.is_overtime_salary_legal ||
        body.has_compensatory_dayoff
    ) {
        return true;
    }
    return false;
};

const hasSalaryFields = body => {
    if (body.salary_type || body.salary_amount || body.experience_in_year) {
        return true;
    }
    return false;
};

const collectWorking = combineSelector([
    commonFieldsSelector,
    R.ifElse(hasWorkingTimeFields, workingTimeFieldsSeletor, R.always({})),
    R.ifElse(hasSalaryFields, salaryFeildsSelector, R.always({})),
]);

function validateIsCurrentlyEmployed(body) {
    if (!requiredNonEmptyString(body.is_currently_employed)) {
        throw new HttpError("是否在職必填", 422);
    }
    if (!shouldIn(body.is_currently_employed, ["yes", "no"])) {
        throw new HttpError("是否在職應為是/否", 422);
    }
    if (body.is_currently_employed === "yes") {
        if (body.job_ending_time_year || body.job_ending_time_month) {
            throw new HttpError("若在職，則離職時間這個欄位沒有意義", 422);
        }
    }
    if (body.is_currently_employed === "no") {
        if (!body.job_ending_time_year) {
            throw new HttpError("離職年份必填", 422);
        }
        if (!body.job_ending_time_month) {
            throw new HttpError("離職月份必填", 422);
        }
        const job_ending_time_year = parseInt(body.job_ending_time_year, 10);
        const job_ending_time_month = parseInt(body.job_ending_time_month, 10);
        const now = new Date();
        if (isNaN(job_ending_time_year)) {
            throw new HttpError("離職年份需為數字", 422);
        }
        if (job_ending_time_year <= now.getFullYear() - 10) {
            throw new HttpError("離職年份需在10年內", 422);
        }
        if (isNaN(job_ending_time_month)) {
            throw new HttpError("離職月份需為數字", 422);
        }
        if (job_ending_time_month < 1 || job_ending_time_month > 12) {
            throw new HttpError("離職月份需在1~12月", 422);
        }
        if (
            (job_ending_time_year === now.getFullYear() &&
                job_ending_time_month > now.getMonth() + 1) ||
            job_ending_time_year > now.getFullYear()
        ) {
            throw new HttpError("離職月份不能比現在時間晚", 422);
        }
    }
}

function validateCommonFields(body) {
    // company_id, company
    if (!requiredNonEmptyString(body.company_id)) {
        if (!requiredNonEmptyString(body.company)) {
            throw new HttpError("公司/單位名稱必填", 422);
        }
    }

    // job_title
    if (!requiredNonEmptyString(body.job_title)) {
        throw new HttpError("職稱未填", 422);
    }

    // is_currently_employed
    validateIsCurrentlyEmployed(body);

    // employment_type
    if (!requiredNonEmptyString(body.employment_type)) {
        throw new HttpError("職務型態必填", 422);
    }
    const employment_types = [
        "full-time",
        "part-time",
        "intern",
        "temporary",
        "contract",
        "dispatched-labor",
    ];
    if (!shouldIn(body.employment_type, employment_types)) {
        throw new HttpError(
            "職務型態需為全職/兼職/實習/臨時工/約聘雇/派遣",
            422
        );
    }

    // gender
    if (body.gender) {
        if (!shouldIn(body.gender, ["male", "female", "other"])) {
            throw new HttpError("若性別有填寫，需為男/女/其他", 422);
        }
    }
}

function validateWorkingTimeData(body) {
    // week_work_time
    if (!body.week_work_time) {
        throw new HttpError("最近一週實際工時未填", 422);
    }
    const week_work_time = parseFloat(body.week_work_time);
    if (isNaN(week_work_time)) {
        throw new HttpError("最近一週實際工時必須是數字", 422);
    }
    if (week_work_time < 0 || week_work_time > 168) {
        throw new HttpError("最近一週實際工時必須在0~168之間", 422);
    }

    // overtime_frequency
    if (!body.overtime_frequency) {
        throw new HttpError("加班頻率必填", 422);
    }
    if (!shouldIn(body.overtime_frequency, ["0", "1", "2", "3"])) {
        throw new HttpError("加班頻率格式錯誤", 422);
    }

    // day_promised_work_time
    if (!body.day_promised_work_time) {
        throw new HttpError("工作日表訂工時未填", 422);
    }
    const day_promised_work_time = parseFloat(body.day_promised_work_time);
    if (isNaN(day_promised_work_time)) {
        throw new HttpError("工作日表訂工時必須是數字", 422);
    }
    if (day_promised_work_time < 0 || day_promised_work_time > 24) {
        throw new HttpError("工作日表訂工時必須在0~24之間", 422);
    }

    // day_real_work_time
    if (!body.day_real_work_time) {
        throw new HttpError("工作日實際工時必填", 422);
    }
    const day_real_work_time = parseFloat(body.day_real_work_time);
    if (isNaN(day_real_work_time)) {
        throw new HttpError("工作日實際工時必須是數字", 422);
    }
    if (day_real_work_time < 0 || day_real_work_time > 24) {
        throw new HttpError("工作日實際工時必須在0~24之間", 422);
    }

    // has_overtime_salary
    if (body.has_overtime_salary) {
        if (!shouldIn(body.has_overtime_salary, ["yes", "no", "don't know"])) {
            throw new HttpError("加班是否有加班費應為是/否/不知道", 422);
        }
    }

    // is_overtime_salary_legal
    if (body.is_overtime_salary_legal) {
        if (!body.has_overtime_salary) {
            throw new HttpError("加班應有加班費，本欄位才有意義", 422);
        }

        // assert has_overtime_salary === "yes"
        if (body.has_overtime_salary !== "yes") {
            throw new HttpError("加班應有加班費，本欄位才有意義", 422);
        }

        if (
            !shouldIn(body.is_overtime_salary_legal, [
                "yes",
                "no",
                "don't know",
            ])
        ) {
            throw new HttpError("加班費是否合法應為是/否/不知道", 422);
        }
    }

    // has_compensatory_dayoff
    if (body.has_compensatory_dayoff) {
        if (
            !shouldIn(body.has_compensatory_dayoff, ["yes", "no", "don't know"])
        ) {
            throw new HttpError("加班是否有補修應為是/否/不知道", 422);
        }
    }
}

function validateSalaryData(req) {
    // salary_type
    if (!req.salary_type) {
        throw new HttpError("薪資種類必填", 422);
    }
    if (!shouldIn(req.salary_type, ["year", "month", "day", "hour"])) {
        throw new HttpError("薪資種類需為年薪/月薪/日薪/時薪", 422);
    }

    // salary_amount
    if (!req.salary_amount) {
        throw new HttpError("薪資多寡必填", 422);
    }
    const salary_amount = parseInt(req.salary_amount, 10);
    if (isNaN(salary_amount)) {
        throw new HttpError("薪資需為整數", 422);
    }
    if (salary_amount < 0) {
        throw new HttpError("薪資不小於0", 422);
    }

    // experience_in_year
    if (!req.experience_in_year) {
        throw new HttpError("相關職務工作經驗必填", 422);
    }
    const experience_in_year = parseInt(req.experience_in_year, 10);
    if (isNaN(experience_in_year)) {
        throw new HttpError("相關職務工作經驗需為整數", 422);
    }
    if (experience_in_year < 0 || experience_in_year > 50) {
        throw new HttpError("相關職務工作經驗需大於等於0，小於等於50", 422);
    }
}

function validateRequestBody(body) {
    validateCommonFields(body);

    let hasWorkingTimeData = false;
    let hasSalaryData = false;

    if (hasWorkingTimeFields(body)) {
        hasWorkingTimeData = true;
        validateWorkingTimeData(body);
    }

    if (hasSalaryFields(body)) {
        hasSalaryData = true;
        validateSalaryData(body);
    }

    if (!hasWorkingTimeData && !hasSalaryData) {
        throw new HttpError("薪資或工時欄位擇一必填", 422);
    }
}

async function normalizeData(working, body, mongodb) {
    if (working.is_currently_employed === "no") {
        working.data_time = {
            year: working.job_ending_time.year,
            month: working.job_ending_time.month,
        };
    } else if (working.is_currently_employed === "yes") {
        const date = new Date(working.created_at);
        working.data_time = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
        };
    }

    const company_query = body.company;
    const company_id = body.company_id;
    /*
     * 如果使用者有給定 company id，將 company name 補成查詢到的公司
     *
     * 如果使用者是給定 company name，如果只找到一間公司，才補上 id
     *
     * 其他情況看 issue #7
     */
    const company = await companyHelper.getCompanyByIdOrQuery(
        mongodb,
        company_id,
        company_query
    );
    working.company = company;
    return working;
}

const postHandler = wrap(async (req, res) => {
    validateRequestBody(req.body);

    let working = collectWorking(req.body);

    working.created_at = new Date();

    working.author = {};
    if (req.body.email) {
        working.author.email = req.body.email;
    }
    if (req.user.facebook) {
        working.author.id = req.user.facebook.id;
        working.author.name = req.user.facebook.name;
        working.author.type = "facebook";
    }

    working = await normalizeData(working, req.body, req.db);

    if (working.salary) {
        const estimated_hourly_wage = helper.calculateEstimatedHourlyWage(
            working
        );
        if (typeof estimated_hourly_wage !== "undefined") {
            working.estimated_hourly_wage = estimated_hourly_wage;
        }
    }

    const response_data = { working };
    const collection = req.db.collection("workings");

    try {
        let rec_user = null;
        // 這邊嘗試從recommendation_string去取得推薦使用者的資訊
        if (req.body.recommendation_string) {
            try {
                const result = await recommendation.getUserByRecommendationString(
                    req.db,
                    req.body.recommendation_string
                );

                if (result !== null) {
                    rec_user = result;
                }
            } catch (err) {
                // if recommendation_string is valid
                if (!(err instanceof ObjectIdError)) {
                    throw err;
                }
            }
        }
        if (rec_user !== null) {
            working.recommended_by = rec_user;
            await req.db
                .collection("recommendations")
                .update({ user: rec_user }, { $inc: { count: 1 } });
        } else if (req.body.recommendation_string) {
            // 如果不是 user，依然把 recommendation_string 儲存起來
            working.recommended_by = req.body.recommendation_string;
        }

        const queries_count = await helper.checkAndUpdateQuota(req.db, {
            id: working.author.id,
            type: working.author.type,
        });
        response_data.queries_count = queries_count;

        await collection.insert(working);

        // delete some sensitive information before sending response
        delete response_data.working.recommended_by;

        res.send(response_data);
    } catch (err) {
        throw err;
    }
});

module.exports = postHandler;
