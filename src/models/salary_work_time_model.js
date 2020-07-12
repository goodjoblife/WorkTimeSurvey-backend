const R = require("ramda");
const DataLoader = require("dataloader");
const { salarySchema } = require("./common_schemas");
const { ObjectNotExistError } = require("../libs/errors");
class SalaryWorkTimeModel {
    constructor(manager) {
        this.manager = manager;
        this.collection = manager.db.collection("workings");

        this.byCompanyLoader = new DataLoader(async names => {
            const salaryWorkTimes = await this.findByCompanyNames(names);

            const toGroup = R.groupBy(x => x.company.name);
            const group = toGroup(salaryWorkTimes);
            const results = R.pipe(
                R.flip(R.props)(group),
                R.map(R.defaultTo([]))
            )(names);

            return results;
        });

        this.byJobTitleLoader = new DataLoader(async job_titles => {
            const salaryWorkTimes = await this.findByJobTitles(job_titles);

            const toGroup = R.groupBy(x => x.job_title);
            const group = toGroup(salaryWorkTimes);
            const results = R.pipe(
                R.flip(R.props)(group),
                R.map(R.defaultTo([]))
            )(job_titles);

            return results;
        });
    }

    /**
     * 透過 _id 來取得單筆資料
     * @param {ObjectId} _id - salary work time id
     * @param {object} opt - mongodb find field filter
     * @returns {Promise}
     *  - resolved : SalaryWorkTime object
     *  - reject : ObjectNotExistError/Default Error
     */
    async findOneOrFail(_id, opt = {}) {
        const salaryWorkTime = await this.collection.findOne({ _id }, opt);
        if (salaryWorkTime) {
            return salaryWorkTime;
        }
        throw new ObjectNotExistError("該筆薪資工時不存在");
    }

    async findByCompanyNames(names) {
        // 特殊 find，為了給 dataloader 用
        return await this.collection
            .find({
                status: "published",
                "archive.is_archived": false,
                "company.name": { $in: names },
            })
            .sort({ created_at: -1 })
            .toArray();
    }

    async findByJobTitles(job_titles) {
        // 特殊 find，為了給 dataloader 用
        return await this.collection
            .find({
                status: "published",
                "archive.is_archived": false,
                job_title: { $in: job_titles },
            })
            .sort({ created_at: -1 })
            .toArray();
    }

    async createSalaryWorkTime(salaryWorkTime) {
        if (salaryWorkTime && salaryWorkTime.salary) {
            const result = salarySchema.validate(salaryWorkTime.salary);
            if (result.error) {
                throw result.error;
            }
        }
        return await this.collection.insertOne(salaryWorkTime);
    }
}

module.exports = SalaryWorkTimeModel;
