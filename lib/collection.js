var _ = require("lodash");
var marked = require("marked");

function Collection (nat, structure, validate) {
    this._native = nat;
    this._structure = structure;
    this._validate = validate || false;

    {   // validate
        _.each(structure, function (val, key) {
            if (_.isUndefined(Collection.prototype.typesInt[val])) {
                throw "Invalid structure. Use only the given types !";
            }
        })
    }
}

Collection.prototype.getStructure = function () {
    return _.map(_.pairs(this._structure), function (i) {
        return {
            key: i[0],
            type: Collection.prototype.typesInt[i[1]]
        }
    })
}

Collection.prototype.validate = function (d, c) {
     var keys = _.keys(this._structure);

    // check each value of the doc to match the defined structure
    for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf("_") === 0) {
            c("Document contains invalid key ! (" + keys[i] + ")");
            return false;
        }

        if (_.isUndefined(d[keys[i]]) ||                                    // value missing => not good
            _.isNumber(d[keys[i]]) && this._structure[keys[i]] !== 0 ||     // value is a number, but shouldn't be => not good
            _.isDate(d[keys[i]])   && this._structure[keys[i]] !== 1 ||     // value is a date, but shouldn't be => not good
           !_.isString(d[keys[i]]) && this._structure[keys[i]] > 1) {       // value is not a string, but should be => not good

            c("Document doesn't match structure ! (" + keys[i] + ")");
            return false;
        }

        if (this._structure[keys[i]] === 4) { // markdown
            d[keys[i]] = {
                raw: d[keys[i]],
                html: marked(d[keys[i]])
            }
        }
    }

    if (this._validate !== false && this._validate(d, this) !== true) {
        c("Document doesn't validate custom logic !");
        return false;
    }

    c();
    return true;
}


Collection.prototype.findOne = function () {
    return this._native.findOne.apply(this._native, arguments);
}

Collection.prototype.find = function () {
    return this._native.find.apply(this._native, arguments);
}

Collection.prototype.remove = function () {
    return this._native.remove.apply(this._native, arguments);
}

Collection.prototype.update = function (q, d, c) {
    var t = this;

    this.validate(d, function (err) {
        if (err)
            c(err);
        else {
            d._modified = new Date();
            t._native.update(q, { $set: d }, c);
        }
    })
}

Collection.prototype.insert = function (d, c) {
    var t = this;

    this.validate(d, function (err) {
        if (err)
            c(err);
        else {
            d._created = d._modified = new Date();
            t._native.insert(d, c);
        }
    })
}

Collection.prototype.types = Object.freeze({
    number      : 0,
    date        : 1,
    string      : 2,
    text        : 3,
    markdown    : 4,
})

Collection.prototype.typesInt = Object.freeze(_.invert(Collection.prototype.types));

module.exports = Collection;