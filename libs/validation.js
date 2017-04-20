function required_string(field) {
    if (typeof field === 'string') {
        return true;
    }
    return false;
}

function required_non_empty_string(field) {
    if (typeof field === 'string') {
        if (field !== "") {
            return true;
        }
        return false;
    }
    return false;
}

function required_number(field) {
    if (typeof field === 'number') {
        return true;
    }
    return false;
}

function optional_string(field) {
    if (typeof field === 'undefined') {
        return true;
    } else if (typeof field === 'string') {
        return true;
    }
    return false;
}

function optional_number(field) {
    if (typeof field === 'undefined') {
        return true;
    } else if (typeof field === 'number') {
        return true;
    }
    return false;
}

function should_in(field, range) {
    return (range.indexOf(field) !== -1);
}

module.exports = {
    required_string,
    required_non_empty_string,
    required_number,
    optional_string,
    optional_number,
    should_in,
};
