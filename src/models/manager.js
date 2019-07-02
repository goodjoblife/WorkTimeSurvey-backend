const CompanyKeywordModel = require("./company_keyword_model");
const CompanyModel = require("./company_model");
const ExperienceLikeModel = require("./experience_like_model_v2");
const JobTitleKeywordModel = require("./job_title_keyword_model");
const SalaryWorkTimeModel = require("./salary_work_time_model");
const UserModel = require("./user_model");
const ViewLogModel = require("./view_log_model");
const ExperienceModel = require("./experience_model_v2");

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

    get ExperienceLikeModel() {
        return new ExperienceLikeModel(this);
    }

    get JobTitleKeywordModel() {
        return new JobTitleKeywordModel(this);
    }

    get SalaryWorkTimeModel() {
        if (!this._salary_work_time_model) {
            this._salary_work_time_model = new SalaryWorkTimeModel(this);
        }
        return this._salary_work_time_model;
    }

    get UserModel() {
        return new UserModel(this);
    }

    get ViewLogModel() {
        return new ViewLogModel(this);
    }

    get WorkExperienceModel() {
        // Note: if you use dataLoader in Model, you can only create
        // one instance of model.
        if (!this._work_experience_model) {
            this._work_experience_model = new ExperienceModel(
                this,
                ExperienceModel.TYPE.WORK
            );
        }
        return this._work_experience_model;
    }

    get InterviewExperienceModel() {
        // Note: if you use dataLoader in Model, you can only create
        // one instance of model.
        if (!this._interview_experience_model) {
            this._interview_experience_model = new ExperienceModel(
                this,
                ExperienceModel.TYPE.INTERVIEW
            );
        }
        return this._interview_experience_model;
    }
}

module.exports = ModelManager;
