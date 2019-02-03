const EMAIL_TEMPLATES = {
    ACCOUNT_VERIFY_SUCCESS: require("./verify_success"),
};

// just for converting to { AAA: 'AAA', BBB: 'BBB' } format
const EMAIL_TEMPLATE_NAMES = Object.keys(EMAIL_TEMPLATES).reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});

module.exports = {
    EMAIL_TEMPLATES,
    EMAIL_TEMPLATE_NAMES,
};
