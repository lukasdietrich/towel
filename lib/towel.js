var bodyParser  = require("body-parser");
var express     = require("express");
var session     = require("express-session");
var mongodb     = require("mongodb");
var chalk       = require("chalk");
var path        = require("path");
var fs          = require("fs");
var _           = require("lodash");

var Collection  = require("./collection.js");
var Model       = require("./model.js");

var backend     = require("./backend.js");
var logger      = require("./logger.js")("towel");

/**
 * Main cms instance
 */
function Towel (dir) {
    var that = this;

    this._app = express();
    this._collections = {};
    this._models = {};

    var config = require(path.join(dir, "config.json"));

    {   // configure express
        that._app.use(session({ 
            resave: false,
            saveUninitialized: false,
            secret: ( 
                // generate random secret functionally
                // in 5 (actually 6) steps
                function a (n) { 
                    if (n < 1) return ""; 
                    return Math.random().toString(16).substring(2) + a(n-1) 
                } 
            (5)) 
        }))

        that._app.use(bodyParser.urlencoded({ extended: false }));

        that._app.set("views", path.join(dir, "templates"));  // set the templates directory to ~/templates
        that._app.set("view engine", "jade");                 // set the templating engine
    }

    {   // connect to database and stuff
        mongodb.MongoClient.connect("mongodb://" + config.mongodb, function (err, db) {
            if (err) {
                logger.err("Couldn't connect to mongodb: '%s'", [err]);
                return;
            }

            that.db = db;

            {   // load models
                var models_ = path.join(dir, "models");
                var models  = fs.readdirSync(models_);

                for (var i = 0; i < models.length; i++) {
                    var m = new Model();
                    require(path.join(models_, models[i]))          // load a model as a node module
                           (that.registerCollection.bind(that),     // then call it with registerCollection()
                            m.registerRoute.bind(m),                //                   registerRoute()
                            Collection.prototype.types,             //                   Collection.types
                            mongodb.ObjectID);                      //               and Mongodb.ObjectID

                    that._models[path.basename(models[i], ".js")] = m;  // then add it to the list of models
                }
            }

            {   // load routes
                var views  = [];
                var routes = require(path.join(dir, "routes"));     // routes are stored in a json object
                                                                    // in the form { route : model }

                // create a scoped function to handle requests
                // via a given handler
                var makeRouteHandler = function (handler, view) {
                    var logServe = function (req, t0) {
                        logger.log("served %s in %sms", [req.path, chalk.yellow(Date.now() - t0)]);
                    }

                    return function (req, res) {
                        var t0 = Date.now();

                        handler(req, that._collections, (
                            // create a function, that can be called like
                            // 1) func("template-name", {})
                            // 2) func.send("raw text", "text/plain")
                            // 3) func.sendFile("/my-file.img")
                            function () {
                                var resp = function (path, partials) {
                                    res.render(path, { 
                                        views: views, 
                                        view: view || false, 
                                        data: partials || false 
                                    })

                                    logServe(req, t0);
                                }

                                resp.sendFile = function (file) {
                                    res.sendFile(file);
                                    logServe(req, t0);
                                }

                                resp.send = function (data, mime) {
                                    if (mime)
                                        res.type(mime);
                                    res.send(data);
                                    logServe(req, t0);
                                }

                                return resp;
                            } ()
                        ));
                    }
                }

                _.each(routes, function (val, key) {
                    var modelname = val;

                    // if the value of a route is not just a string, inspect if it has a name
                    if (!_.isString(val)) {
                        modelname = val.model;

                        // if it has a name, it is a view and can be used in layouts
                        if (val.name) {
                            val.base = key;
                            views.push(val);
                        }
                    }

                    // if there is no model with that name already, register it
                    // otherwise an error is thrown, indicating that such a model
                    // already exists
                    if (!_.isUndefined(that._models[modelname])) {
                        // normalize the path, so that we have a leading "/" and no "\"
                        var base = path.normalize("/" + key).replace(/\\/g, "/");

                        // check for invalid route,
                        // which is anything starting with "/towel", 
                        // because these are reserved for towel.js backend
                        if (base.indexOf("/towel") === 0) 
                            throw "Invalid route: '" + base + "', routes can't start with '/towel' !";

                        logger.break(1);
                        logger.info("┌ routing %s => %s", [base, modelname]);

                        var r = that._models[modelname].routes;

                        // bind each subroute of a model to the "main route"
                        _.each(r, function (route, i) {
                            logger.info(((i === r.length-1) ? "└" : "├") + "─> " + route.route);

                            that._app.get(base + route.route, makeRouteHandler(route.handler, val));
                        })
                    } else throw "There is no model named '" + modelname + "' !";
                })

                logger.break(1);
            }

            {   // register backend to the server
                backend(that._app, db, that._collections, express);
            }

            {   // start the server
                that._app.use("/", express.static(path.join(dir, "static")));   // serve static content
                
                that._app.listen(config.port, function (err) {
                    if (err) throw err;
                    logger.info("Server running on port %d. :-)", [config.port]);
                });
            }
        })
    }
}

Towel.prototype.registerCollection = function (name, structure) {
    // collections cannot start with "towel_", because these are reserved for towel.js
    // although it doesn't "protect" anything, no collection can be created that way
    // from a model file
    if (name.indexOf("towel_") !== 0) {
        // if there is already a collection with the specified name, throw an error
        // indicating it
        if (_.isUndefined(this._collections[name])) {
            logger.info("registering collection ( %s: %s )", [name, _.keys(structure).join(", ")]);
            this._collections[name] = new Collection(this.db.collection(name), structure);
        } else throw "Cant create multiple collections with the same name '" + name + "' !";
    } else throw "Invalid collection name: '" + name + "', collections can't start with 'towel_' !";
}

module.exports = Towel;