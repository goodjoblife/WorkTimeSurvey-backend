const escapeRegExp = require("lodash/escapeRegExp");
const R = require("ramda");

/*
 * Company {
 *   id      : String!               統一編號
 *   name    : String! | String[]    名稱, 全部大寫
 *   type    : String!
 *   capital : Int
 * }
 */

function getCompanyName(db_company_name) {
    if (Array.isArray(db_company_name)) {
        return getCompanyName(db_company_name[0]);
    }
    return db_company_name;
}

function normalizeCompany(company) {
    return {
        ...company,
        name: getCompanyName(company.name),
    };
}

class CompanyModel {
    constructor(manager) {
        this.manager = manager;
        this.collection = manager.db.collection("companies");
    }

    async search({ keyword, start = 0, limit = 25 }) {
        const query = {
            $or: [
                {
                    name: new RegExp(`^${escapeRegExp(keyword.toUpperCase())}`),
                },
                { id: keyword },
            ],
        };
        const sort = { capital: -1, type: -1, name: 1, id: 1 };

        const companies = await this.collection
            .find(query)
            .sort(sort)
            .skip(start)
            .limit(limit)
            .toArray();

        return R.map(normalizeCompany)(companies);
    }

    async searchById(id) {
        return this.collection
            .find({
                id,
            })
            .toArray();
    }

    async searchByName(name) {
        return this.collection
            .find({
                name,
            })
            .toArray();
    }
}

module.exports = CompanyModel;
module.exports.getCompanyName = getCompanyName;
