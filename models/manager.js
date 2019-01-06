const CompanyKeywordModel = require("./company_keyword_model");
const CompanyModel = require("./company_model");
const JobTitleKeywordModel = require("./job_title_keyword_model");
const UserModel = require("./user_model");

class ModelManager {
    constructor(db) {
        this.db = db;
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
