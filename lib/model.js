function Model () {
    this.routes = [];
}

Model.prototype.registerRoute = function (route, handler) {
    // super simple, just add it to the list of subroutes
    this.routes.push({
        route: route,
        handler: handler
    })
}

module.exports = Model;