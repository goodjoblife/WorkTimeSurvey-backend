const R = require("ramda");
const DataLoader = require("dataloader");
const CompanyKeywordModel = require("./company_keyword_model");
const CompanyModel = require("./company_model");
const JobTitleKeywordModel = require("./job_title_keyword_model");
const UserModel = require("./user_model");

class ModelManager {
    constructor(db) {
        this.db = db;
    }

    get salaryAndTimeByCompanyLoader() {
        if (!this._salaryAndTimeByCompanyLoader) {
            this._salaryAndTimeByCompanyLoader = new DataLoader(async keys => {
                const collection = this.db.collection("workings");
                const salaryWorkTimes = await collection
                    .find({
                        status: "published",
                        "archive.is_archived": false,
                        "company.name": { $in: keys },
                    })
                    .toArray();

                const toGroup = R.groupBy(x => x.company.name);

                const group = toGroup(salaryWorkTimes);
                const results = R.pipe(
                    R.flip(R.props)(group),
                    R.map(R.defaultTo([]))
                )(keys);

                return results;
            });
        }
        return this._salaryAndTimeByCompanyLoader;
    }

    get CompanyKeywordModel() {
        return new CompanyKeywordModel(this);
    }

    get CompanyModel() {
        return new CompanyModel(this);
    }

    get JobTitleKeywordModel() {
        return new JobTitleKeywordModel(this);
    }

    get UserModel() {
        return new UserModel(this);
    }
}

module.exports = ModelManager;
