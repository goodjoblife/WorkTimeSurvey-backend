const HttpError = require("../libs/errors").HttpError;
const { getCompanyName } = require("../models/company_model");

/*
 * 如果使用者有給定 company id，將 company name 補成查詢到的公司
 *
 * 如果使用者是給定 company query，如果只找到一間公司，才補上 id
 *
 * 其他情況看 issue #7
 */
async function getCompanyByIdOrQuery(company_model, company_id, company_query) {
    if (company_id) {
        const results = await company_model.searchById(company_id);
        if (results.length === 0) {
            throw new HttpError("公司統編不正確", 422);
        }
        return {
            id: company_id,
            name: getCompanyName(results[0].name),
        };
    }
    const results = await company_model.searchById(company_query);
    if (results.length === 0) {
        const nameResults = await company_model.searchByName(
            company_query.toUpperCase()
        );
        if (nameResults.length === 1) {
            return {
                id: nameResults[0].id,
                name: getCompanyName(nameResults[0].name),
            };
        }
        return {
            name: company_query.toUpperCase(),
        };
    }
    return {
        id: results[0].id,
        name: getCompanyName(results[0].name),
    };
}

module.exports = {
    getCompanyByIdOrQuery,

    // deprecated exports, don't use it
    getCompanyName,
};
