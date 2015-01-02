var sprintf = require("sprintf").vsprintf;
var chalk = require("chalk");
var dateformat = require("dateformat");

var log_level = 0; // global variable for all logger instances

function Logger (scope, df) {
    this._scope = scope;
    this._df = df || "HH:MM:ss";
}

Logger.prototype._print = function (prefix, format, args) {
    console.log(
        sprintf("%s %s %s", [
            prefix, 
            chalk.gray(dateformat(new Date(), this._df)), 
            chalk.cyan(this._scope)
        ]), 
        chalk.gray("\u00BB"), 
        sprintf(format, args || [])
    );
}

Logger.prototype.break = function (lvl) {
    if (log_level < lvl)
        console.log();
}

Logger.prototype.log = function (format, args) {
    if (log_level < 1)
        this._print(chalk.magenta("log"), format, args);
}

Logger.prototype.info = function (format, args) {
    if (log_level < 2)
        this._print(chalk.green("info"), format, args);
}

Logger.prototype.warn = function (format, args) {
    if (log_level < 3)
        this._print(chalk.yellow("warn"), format, args);
}

Logger.prototype.err = function (format, args) {
    if (log_level < 4)
        this._print(chalk.red("error"), format, args);
}

Logger.prototype.setLogLevel = function (level) {
    log_level = level;
}

module.exports = function (scope, df) {
    return new Logger(scope, df);
}