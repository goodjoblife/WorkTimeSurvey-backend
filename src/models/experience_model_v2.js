const R = require("ramda");
const DataLoader = require("dataloader");

class ExperienceModel {
    constructor(manager, type) {
        this.manager = manager;
        this.type = type;
        this.collection = manager.db.collection("experiences");

        this.byCompanyLoader = new DataLoader(async names => {
            const experiences = await this.findByCompanyNames(names, type);
            const toGroup = R.groupBy(x => x.company.name);
            const group = toGroup(experiences);
            const results = R.pipe(
                R.flip(R.props)(group),
                R.map(R.defaultTo([]))
            )(names);

            return results;
        });

        this.byJobTitleLoader = new DataLoader(async job_titles => {
            const experiences = await this.findByJobTitles(job_titles, type);

            const toGroup = R.groupBy(x => x.job_title);
            const group = toGroup(experiences);
            const results = R.pipe(
                R.flip(R.props)(group),
                R.map(R.defaultTo([]))
            )(job_titles);

            return results;
        });
    }

    async findByCompanyNames(names, type) {
        // 特殊 find，為了給 dataloader 用
        return await this.collection
            .find({
                status: "published",
                "archive.is_archived": false,
                "company.name": { $in: names },
                type,
            })
            .sort({ created_at: -1 })
            .toArray();
    }

    async findByJobTitles(job_titles, type) {
        // 特殊 find，為了給 dataloader 用
        return await this.collection
            .find({
                status: "published",
                "archive.is_archived": false,
                job_title: { $in: job_titles },
                type,
            })
            .sort({ created_at: -1 })
            .toArray();
    }
}

ExperienceModel.TYPE = {
    WORK: "work",
    INTERN: "intern",
    INTERVIEW: "interview",
};

module.exports = ExperienceModel;
