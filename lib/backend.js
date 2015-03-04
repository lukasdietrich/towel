var objectid = require("mongodb").ObjectID;
var shortid  = require("short-mongo-id");
var moment   = require("moment");
var path     = require("path");
var _        = require("lodash");

var password = require("./password.js");
var logger = require("./logger.js")("backend");

function registerBackend (app, db, collections, express) {

    var dir = path.join(__dirname, "../backend");

    // we need a custom render function, because stahpid express thinks,
    // that all templates are in the project folder Q.Q !
    // I know, stupid.
    function render (res, view, partials) {
        res.render(path.join(dir, view + ".jade"), partials);
    }

    // middleware to check for for authorization
    app.use("/towel", function (req, res, next) {
        // request is okay, if user is logged in or the path is directing to
        // either "/login" or any resource like "/css/style.css",
        // because neither do hold information or can change the database
        if (req.session.login === true || req.path.match(/^\/(login|[a-z\.\/]+\.(css|js))$/)) {
            next();
        } else {
            logger.warn("restrict access => /towel%s", [req.path]);
            res.redirect("/towel/login");
        }
    })

    // login page
    app.all("/towel/login", function (req, res) {
        if (req.body.mail && req.body.pass) {
            db.collection("towel_users").find({ 
                mail: req.body.mail
            }).limit(1).toArray(function (err, docs) {
                var b = docs.length > 0 && password.compare(req.body.pass, docs[0].pass);

                logger.log("correct login info: %s", [ (b) ? "Yes" : "No" ]);
                    
                if (b) {
                    logger.log("redirecting to /towel");
                    
                    req.session.login = true;
                    res.redirect("/towel");
                } else {
                    render(res, "login", { err: "Invalid username or password" });
                }
            })
        } else {
            render(res, "login");
        }
    })

    // index site with info widgets
    app.all("/towel", function (req, res) {
        render(res, "index", { 
            ajax: !_.isUndefined(req.query.ajax),
            collections: _.keys(collections)
        });
    })

    // collection index
    app.get("/towel/:collection", function (req, res) {
        var col = collections[req.params.collection];
        var proj = { _created: 1, _modified: 1 };

        if (col._significantKey !== false) {
            proj[col._significantKey] = 1;
        }

        col.find({}, proj).sort({ _id: -1 }).limit(10).toArray(function (err, docs) {
            render(res, "collection", {
                ajax: !_.isUndefined(req.query.ajax),
                collections: _.keys(collections), 
                collection: req.params.collection,
                structure: col.getStructure(),
                significantKey: col._significantKey,
                docs: _.map(docs, function (item) {
                    _.each(["_created", "_modified"], function (attr) {
                        item[attr] = moment(item[attr]).format("DD/MM/YYYY HH:mm:ss");
                    })

                    item._shortid = shortid(item._id);

                    return item;
                })
            })
        })
    })

    // insert document
    app.all("/towel/:collection/insert", function (req, res) {
        var col = collections[req.params.collection];

        if (_.isEmpty(req.body)) {
            render(res, "insert_edit", {
                ajax: !_.isUndefined(req.query.ajax),
                collections: _.keys(collections),
                collection: req.params.collection,
                structure: col.getStructure()
            })
        } else {
            col.insert(req.body, function (err) {
                if (!_.isUndefined(req.query.ajax)) {
                    res.send({ err: err });
                } else {
                    res.redirect("/towel/" + req.params.collection);
                }
            })
        }
    })

    // insert document
    app.all("/towel/:collection/:id/edit", function (req, res) {
        var col = collections[req.params.collection];

        if (_.isEmpty(req.body)) {
            col.find({ _id : new objectid(req.params.id) }).limit(1).toArray(function (err, docs) {
                render(res, "insert_edit", {
                    ajax: !_.isUndefined(req.query.ajax),
                    collections: _.keys(collections),
                    collection: req.params.collection,
                    structure: col.getStructure(),
                    doc: docs[0]
                })
            })
        } else {
            col.update({ _id : new objectid(req.params.id) }, req.body, function (err) {
                if (!_.isUndefined(req.query.ajax)) {
                    res.send({ err: err });
                } else {
                    res.redirect("/towel/" + req.params.collection);
                }
            })
        }
    })

    // delete document
    app.get("/towel/:collection/:id/delete", function (req, res) {
        collections[req.params.collection].remove({ _id : new objectid(req.params.id) }, function (err) {
            if (!_.isUndefined(req.query.ajax)) {
                res.send({ err: err });
            } else {
                res.redirect("/towel/" + req.params.collection);
            }
        })
    })

    app.use("/towel", express.static(dir));

}

module.exports = registerBackend;