const HttpError = require('../libs/errors').HttpError;
const CompanyService = require('../models/company_model');

function _getCompanyName(db_company_name) {
    if (Array.isArray(db_company_name)) {
        return _getCompanyName(db_company_name[0]);
    }
    return db_company_name;
}

/*
 * 如果使用者有給定 company id，將 company name 補成查詢到的公司
 *
 * 如果使用者是給定 company query，如果只找到一間公司，才補上 id
 *
 * 其他情況看 issue #7
 */
function getCompanyByIdOrQuery(db, company_id, company_query) {
    const company_service = new CompanyService(db);
    if (company_id) {
        return company_service.searchCompanyById(company_id).then((results) => {
            if (results.length === 0) {
                throw new HttpError("公司統編不正確", 422);
            }

            return {
                id: company_id,
                name: _getCompanyName(results[0].name),
            };
        });
    }
    return company_service.searchCompanyById(company_query).then((results) => {
        if (results.length === 0) {
            return company_service
                .searchCompanyByName(company_query.toUpperCase())
                .then((nameResults) => {
                    if (nameResults.length === 1) {
                        return {
                            id: nameResults[0].id,
                            name: _getCompanyName(nameResults[0].name),
                        };
                    }
                    return {
                        name: company_query.toUpperCase(),
                    };
                });
        }
        return {
            id: results[0].id,
            name: _getCompanyName(results[0].name),
        };
    });
}

function getCompanyName(db_company_name) {
    return _getCompanyName(db_company_name);
}

module.exports = {
    getCompanyByIdOrQuery,
    getCompanyName,
};
