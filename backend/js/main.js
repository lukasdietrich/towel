$(function () {

    function TowelBackend ($main, $actions, $notify, progress) {
        this.progress = progress;

        this.$main = $main;
        this.$actions = $actions;
        this.$notify = $notify.hide();

        progress.configure({
            showSpinner: false
        })
    }

    TowelBackend.prototype.main = function () {
        $(window).bind("popstate", function (e) {
            if (e.originalEvent && e.originalEvent.state && e.originalEvent.state.url) {
                backend.loadAjax(e.originalEvent.state.url, true);
                return false;
            }
        })

        $(".wrapper").on("submit", "form", function () {
            var o = {}, 
                a = $(this).serializeArray(),
                u = $(this).attr("action");

            for (var i = a.length - 1; i >= 0; i--) {
                o[a[i].name] = a[i].value;
            }

            $.post(u + "?ajax", o, function (res) {
                backend.notifyAndLoad(res.err, "successfully inserted document", u.match(/^\/towel\/([^\/]+)/)[0])
            }, "json")

            return false;
        }).on("click", "a", function () {
            var href = $(this).attr("href");

            if ($(this).hasClass("doc-delete")) {
                $.get(href + "?ajax", function (res) {
                    backend.notifyAndLoad(res.err, "successfully deleted document", href.match(/^\/towel\/([^\/]+)/)[0])
                }, "json")

                return false;
            } else if (href.match(/^\/towel/)) {
                var match;
                $(".collection-select .current").text(
                    (match = href.match(/^\/towel\/([^\/]+)/)) 
                    ? match[1] 
                    : "select a collection"
                );

                backend.loadAjax(href);
                
                return false;
            }
        })

        this.afterDomChange();
    }

    TowelBackend.prototype.notifyAndLoad = function (err, msg, url) {
        this.notify(err || msg, (err) ? "err" : "info");
        this.loadAjax(url);
    }

    TowelBackend.prototype.notify = function (message, type) {
        type = type || "info";

        this.$notify.stop()
                    .removeClass("info err")
                    .addClass(type)
                    .text(message)
                    .slideDown(300)
                    .delay(3000)
                    .slideUp(300);
    }

    TowelBackend.prototype.loadAjax = function (url, dontPush) {
        var t = this;
            t.progress.start();

        if (history && !dontPush) {
            history.pushState({ url: url }, url, url);
        }

        console.log("loading %s?ajax (pushing state = %s)", url, history && !dontPush);

        $.get(url + "?ajax", function (res) {
            res = $.parseHTML(res);

            t.$actions.html(res[0].innerHTML);
            t.$main.html(res[1].innerHTML);

            t.afterDomChange();
            t.progress.done();
        })
    }

    TowelBackend.prototype.afterDomChange = function () {
        // markdown editor
        $(".markdown").each(function () {
            $(this).wrap($("<div>").addClass("split-editor"))
                   .parent()
                   .append($("<div>").addClass("split-output"));

            $(this).keyup(function () {
                $(this).next(".split-output").html(marked($(this).val()));
            }).trigger("keyup");
        })
    }

    var backend = new TowelBackend($(".main"), $(".actions"), $(".notify"), NProgress);
        backend.main();

})