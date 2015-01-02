#!/usr/bin/env node

var fs     = require("fs");
var path   = require("path");
var yargs  = require("yargs");

var password = require("./password.js");
var towel  = require("./towel.js");
var logger = require("./logger.js")("index");

function main (args) {
    var p;

    if (args.path && fs.existsSync(p =  path.resolve(args.p))) {
        logger.info("Project path is '%s'", [p]);
        
        switch(args._[0].toLowerCase()) {
            case "start":
                if (args.no_log) {
                    logger.setLogLevel(1);
                }
            
                new towel(p);
                break;

            case "adduser":
                // load prompt here, because "colors" is a bad module !
                // prototyping strings and stuff
                var prompt  = require("prompt");
                var mongodb = require("mongodb");
                var config  = require(path.join(p, "config.json"));

                prompt.delimiter = prompt.message = "";
                prompt.start();
                
                prompt.get([ 
                    {
                        name: "mail",
                        message: "E-Mail",
                        validator: /^[^@]+@[^@]+\.[^@]+$/,
                        warning: "Must follow the schema 'a@b.c'",
                        required: true
                    }, {
                        name: "pass1", 
                        message: "Password",
                        warning: "Password needs to be at least 6 characters",
                        hidden: true,
                        required: true,
                        conform: function (pass) {
                            return pass.length > 5
                        }
                    }, {
                        name: "pass2",
                        message: "Repeat password",
                        warning: "Passwords need to match",
                        hidden: true,
                        required: true,
                        conform: function (confirm) {
                            return confirm === prompt.history("pass1").value;
                        }
                    }
                ],  function (err, result) {
                    if (err) {
                        logger.err(err);
                    } else {
                        mongodb.MongoClient.connect("mongodb://" + config.mongodb, function (err, db) {
                            if (err) {
                                logger.err(err);
                            } else {
                                db.collection("towel_users").insert({ 
                                    mail: result.mail, 
                                    pass: password.hash(result.pass1) 
                                }, function (err) {
                                    if (err) {
                                        logger.err(err);
                                    } else {
                                        logger.info("Successfully added user %s!", [result.mail]);                                
                                    }
                                })
                            }
                        })
                    }
                })
                break;

            default:
                logger.err("undefined action '%s' !", [args._[0]]);
        }

    } else {
        logger.err("Path not found '%s' !", [args.path]);
    }
}

main(
    yargs.usage("Usage: $ $0 [start;adduser] -p [path] [--no_log]")
         .example("$ $0 start -p ~/my-project", "starts the towel.js server for a given project")
         .example("$ $0 adduser -p ~/my-project", "initiates a dialogue to create a user")
         .alias("p", "path")
         .alias("n", "no_log")
         .demand("p")
         .demand(1)
         .argv
);