/*globals jQuery,$,CountlyHelpers,UpdatesView,countlyGlobal,app,countlyView,T,countlyUpdates */
window.UpdatesView = countlyView.extend({
    initialize: function() {

    },
    beforeRender: function() {
        var self = this;
        return $.when(T.render('/updates/templates/updates.html', function(src) {
            self.template = src;
        }), countlyUpdates.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {
        this.templateData = {
            'page-title': jQuery.i18n.map['updates.title'],
            updates: countlyUpdates.getData()
        };
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $('.btn-update').on('click', function() {
                var id = $(this).data('id'), type = $(this).data('type');
                CountlyHelpers.confirm(jQuery.i18n.map['updates.confirm-update'], 'red', function(result) {
                    if (!result) {
                        return true;
                    }

                    var loading = CountlyHelpers.loading(jQuery.i18n.map['updates.running']);

                    $.when(countlyUpdates.update(type, id)).then(function(data) {
                        if (!data || !data.id) {
                            CountlyHelpers.removeDialog(loading);
                            CountlyHelpers.alert(data ? data.error : 'Unknown error', 'red');
                        }
                        else {
                            var msg = {clearAll: true};
                            msg.title = jQuery.i18n.map['updates.updating'];
                            msg.message = jQuery.i18n.map['updates.restart'];
                            msg.info = jQuery.i18n.map['updates.finish'];
                            msg.delay = 3000;
                            CountlyHelpers.notify(msg);

                            var startCheck = function() {
                                countlyUpdates.check(data.key).then(handle, handle);
                            };

                            var handle = function(check, status) {
                                if (status === 'error' || !check || !check.status) {
                                    // overlay.hide();v
                                    // loader.hide();
                                    // CountlyHelpers.alert(check ? check.error : 'Unknown error', 'red');
                                    setTimeout(startCheck, 2000);
                                }
                                else if (check.status === 'pending') {
                                    setTimeout(startCheck, 2000);
                                }
                                else if (check.status === 'success') {
                                    CountlyHelpers.removeDialog(loading);
                                    msg = {clearAll: true};
                                    msg.title = jQuery.i18n.map['updates.success'];
                                    msg.message = jQuery.i18n.map['updates.updated'];
                                    msg.info = '';
                                    msg.delay = 3000;
                                    CountlyHelpers.notify(msg);
                                    setTimeout(window.location.reload.bind(window.location, true), 3000);
                                }
                                else {
                                    setTimeout(startCheck, 2000);
                                }

                            };
                            setTimeout(startCheck, 10000);
                        }
                    });
                });
            });
        }
    },
    refresh: function() {
    }
});


//register views
app.updatesView = new UpdatesView();

if (countlyGlobal.member.global_admin) {
    app.route('/manage/updates', 'updates', function() {
        this.renderWhenReady(this.updatesView);
    });
}

$(document).ready(function() {
    if (countlyGlobal.member.global_admin) {
        var menu = '<a href="#/manage/updates" class="item">' +
            '<div class="logo-icon fa fa-exclamation-triangle"></div>' +
            '<div class="text" data-localize="updates.title"></div>' +
        '</a>';
        if ($('#management-submenu .help-toggle').length) {
            $('#management-submenu .help-toggle').before(menu);
        }
    }
});