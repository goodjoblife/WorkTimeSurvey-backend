class JobTitleKeywordModel {
    constructor(manager) {
        this.manager = manager;
        this.collection = manager.db.collection("job_title_keywords");
    }

    async createKeyword(word) {
        return await this.collection.insertOne({ word });
    }

    async aggregate({ limit }) {
        return await this.collection
            .aggregate([
                {
                    $group: {
                        _id: "$word",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: limit },
            ])
            .toArray();
    }
}

module.exports = JobTitleKeywordModel;
