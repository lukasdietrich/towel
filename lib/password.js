var bcrypt = require("bcrypt-nodejs");

module.exports = {
    // use bcrypt to generate a hash
    hash: function (pass) {
        return bcrypt.hashSync(pass, bcrypt.genSaltSync(8));
    },

    // use bcrypt to compare a pass to 
    // a previously generated hash
    compare: function (pass, hash) {
        return bcrypt.compareSync(pass, hash);
    }
}