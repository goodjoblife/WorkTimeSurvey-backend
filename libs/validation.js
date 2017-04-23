function requiredString(field) {
    if (typeof field === 'string') {
        return true;
    }
    return false;
}

function requiredNonEmptyString(field) {
    if (typeof field === 'string') {
        if (field !== "") {
            return true;
        }
        return false;
    }
    return false;
}

function stringRequireLength(field, min, max) {
    if (typeof field !== 'string') {
        return false;
    }
    if (min && field.length < min) {
        return false;
    }
    if (max && field.length > max) {
        return false;
    }
    return true;
}

function requiredNumber(field) {
    if (typeof field === 'number') {
        return true;
    }
    return false;
}

function optionalString(field) {
    if (typeof field === 'undefined') {
        return true;
    } else if (typeof field === 'string') {
        return true;
    }
    return false;
}

function optionalNumber(field) {
    if (typeof field === 'undefined') {
        return true;
    } else if (typeof field === 'number') {
        return true;
    }
    return false;
}

function shouldIn(field, range) {
    return (range.indexOf(field) !== -1);
}

module.exports = {
    requiredString,
    requiredNonEmptyString,
    requiredNumber,
    optionalString,
    optionalNumber,
    shouldIn,
    stringRequireLength,
};
