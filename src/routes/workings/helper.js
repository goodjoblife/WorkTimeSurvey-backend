const HttpError = require("../../libs/errors").HttpError;
const { shouldIn } = require("../../libs/validation");

function calculateEstimatedHourlyWage(working) {
    let estimated_hourly_wage;

    if (working.salary.type === "hour") {
        estimated_hourly_wage = working.salary.amount;
    } else if (working.day_real_work_time && working.salary.type === "day") {
        estimated_hourly_wage =
            working.salary.amount / working.day_real_work_time;
    } else if (working.day_real_work_time && working.week_work_time) {
        if (working.salary.type === "month") {
            estimated_hourly_wage =
                (working.salary.amount * 12) /
                (52 * working.week_work_time -
                    (12 + 7) * working.day_real_work_time);
        } else if (working.salary.type === "year") {
            estimated_hourly_wage =
                working.salary.amount /
                (52 * working.week_work_time -
                    (12 + 7) * working.day_real_work_time);
        }
    }

    return estimated_hourly_wage;
}

function calculateEstimatedMonthlyWage(working) {
    switch (working.salary.type) {
        case "hour":
            // 時薪 * (52 * 每週平均工時 - (12天國假 + 7天特休) * 工作日實際工時) / 12
            if (working.week_work_time && working.day_real_work_time) {
                return (
                    (working.salary.amount *
                        (52 * working.week_work_time -
                            (12 + 7) * working.day_real_work_time)) /
                    12
                );
            }
            return;
        case "day":
            // (日薪/工作日實際工時) * (52 * 每週平均工時 - (12天國假 + 7天特休) * 工作日實際工時) / 12
            if (working.week_work_time && working.day_real_work_time) {
                return (
                    ((working.salary.amount / working.day_real_work_time) *
                        (52 * working.week_work_time -
                            (12 + 7) * working.day_real_work_time)) /
                    12
                );
            }
            return;
        case "month":
            return working.salary.amount;
        case "year":
            // 年薪 / 12 估算
            return working.salary.amount / 12;
        default:
            return;
    }
}

function validSortQuery(query) {
    if (query.sort_by) {
        if (
            !shouldIn(query.sort_by, [
                "created_at",
                "week_work_time",
                "estimated_hourly_wage",
            ])
        ) {
            throw new HttpError("query: sort_by error", 422);
        }
    }
    if (query.order) {
        if (!shouldIn(query.order, ["descending", "ascending"])) {
            throw new HttpError("query: order error", 422);
        }
    }
}

function pickupSortQuery(query) {
    const sort_by = query.sort_by || "created_at";
    const order = (query.order || "descending") === "descending" ? -1 : 1;
    const sort = {
        [sort_by]: order,
    };
    return { sort_by, order, sort };
}

module.exports = {
    calculateEstimatedHourlyWage,
    calculateEstimatedMonthlyWage,
    validSortQuery,
    pickupSortQuery,
};
