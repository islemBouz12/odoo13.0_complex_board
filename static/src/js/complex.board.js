 /**
     * Description：complexView
     * information.
     * Date: 2019.11.07
     * Updater: wangjuan04@inspur.com
 */

odoo.define('complex.ComplexView', function (require) {
    "use strict";

    var Context = require('web.Context');
    var config = require('web.config');
    var core = require('web.core');
    var dataManager = require('web.data_manager');
    var Dialog = require('web.Dialog');
    var Domain = require('web.Domain');
    var FormController = require('web.FormController');
    var FormRenderer = require('web.FormRenderer');
    var FormView = require('web.FormView');
    var pyUtils = require('web.py_utils');
    var session = require('web.session');
    var viewRegistry = require('web.view_registry');

    var _t = core._t;
    var _lt = core._lt;
    var QWeb = core.qweb;

    // 状态管理
    var barStore = {
        inState: [],
        outState: []
    };

    var ComplexController = FormController.extend({
        custom_events: _.extend({}, FormController.prototype.custom_events, {
            change_layout: '_onChangeLayout',
            save_dashboard: '_saveDashboard',
            choose_menu: '_onChooseMenu',
            switch_view: '_onSwitchView',
            enable_cmplexboard: '_onEnableComplexboard',
            setState: '_onSetState'
        }),
        init: function (parent, model, renderer,params) {
            this._super.apply(this, arguments);
            this.customViewID = params.customViewID;
        },

        getTitle: function () {
            if (this.inDashboard) {
                return _t("My Complexboard");
            }
            return this._super.apply(this, arguments);
        },

        // todo ??? inComplexboard
        _onEnableComplexboard: function () {
            this.inComplexboard = true;
        },

        //wangjuan
        _onChangeLayout: function (event) {
            // $(".o_content").replaceWith(QWeb.render('ComplexBoard.layouts'));
            var self = this;
            var dialog = new Dialog(this, {
                title: _t("选择首页展示风格"),
                $content: QWeb.render('ComplexBoard.layouts', _.clone(event.data))
            });
            dialog.opened().then(function () {
                dialog.$('li').click(function () {
                    // var layout = $(this).attr('data-layout');
                    // self.renderer.changeLayout(layout);
                    // self._saveDashboard();
                    // dialog.close();
                });
            });
            dialog.open();
        },

        _saveDashboard: function () {
            var board = this.renderer.getBoard();
            var arch = QWeb.render('Complex.xml', _.extend({}, board));
            return this._rpc({
                    route: '/web/view/edit_custom',
                    params: {
                        custom_id: this.customViewID,
                        arch: arch,
                    }
                }).then(dataManager.invalidate.bind(dataManager));
        },

        _onChooseMenu: function () {
            var self = this;
            var dialog = new Dialog(this, {
                title: _t("选择常用菜单"),
                $content: QWeb.render('ComplexBoard.menus', _.clone(event.data))
            });
            dialog.opened().then(function () {
                dialog.$('li').click(function () {
                    // var layout = $(this).attr('data-layout');
                    // self.renderer.changeLayout(layout);
                    // self._saveDashboard();
                    // dialog.close();
                });
            });
            dialog.open();
        },

        _onSetState: function (ev) {
            console.log('ev', ev);
            var self = this;
            if (ev.data.action === 'add') {
                barStore.inState.push(ev.data.app);
            } else {
                // innerHTML
                console.log('del', barStore.inState)
                barStore.inState.splice($.inArray(ev.data.app,barStore.inState),1);
            }
            console.log(barStore);
        //    return QWeb.render('ComplexBoard.BottomBar', {node: barStore})
        }
    })

    var ComplexRenderer = FormRenderer.extend({
        custom_events: _.extend({}, FormRenderer.prototype.custom_events, {

        }),
        events: _.extend({}, FormRenderer.prototype.events, {
            'click .o_complex_bar_icon.o_complex_bar_setting': '_onBarSettingClick', //wangjuan
            'click .o_complex_bar_icon.o_complex_bar_menu': '_onBarMenuClick',
            'click .oe_complexboard_column .oe_fold': '_onFoldClick',
            'click .oe_complexboard_column .oe_close': '_onCloseClick',
            'click .oe_complexboard_column .oe_fullScreen': '_onFullScreen',
            'click .oe_complexboard_column .oe_exitFullScreen': '_onExitFullScreen',
            'click .oe_complexboard_column  .oe_fullScreenTest': '_onFullScreenTest'
        }),
        init: function (parent, state, params) {
            this._super.apply(this, arguments);
            this.noContentHelp = params.noContentHelp;
            this.actionsDescr = {};
            this._boardSubcontrollers = []; // for board: controllers of subviews
            this._boardFormViewIDs = {}; // for board: mapping subview controller to form view id
            console.log('renderer')
        },
        on_attach_callback: function () {
            _.each(this._boardSubcontrollers, function (controller) {
                if ('on_attach_callback' in controller) {
                    controller.on_attach_callback();
                }
            });
        },
        on_detach_callback: function () {
            _.each(this._boardSubcontrollers, function (controller) {
                if ('on_detach_callback' in controller) {
                    controller.on_detach_callback();
                }
            });
        },
        //wangjuan渲染页面
        _renderTagComplex: function (node) {
            var self = this;
            this.$el.addClass('o_complexboard');
            this.trigger_up('enable_cmplexboard');

            var hasAction = _.detect(node.children, function (column) {
                return _.detect(column.children,function (element){
                    console.log('ele', element);
                    return element.tag === "action"? element: false;
                });
            });
            if (!hasAction) {
                return $(QWeb.render('Complex.NoContent'));
            }

            node = $.extend(true, {}, node);

            if (!('layout' in node.attrs)) {
                node.attrs.layout = node.attrs.style;
            }

            for (var i = node.children.length; i < 3; i++) {
                node.children.push({
                    tag: 'column',
                    attrs: {},
                    children: []
                });
            }

            _.each(node.children, function (column, column_index) {
                _.each(column.children, function (action, action_index) {
                    action.attrs.id = 'action_' + column_index + '_' + action_index;
                    self.actionsDescr[action.attrs.id] = action.attrs;
                });
            });

            var $html = $('<div>').append($(QWeb.render('Complex', {node: node, isMobile: config.device.isMobile})));
            _.each(this.actionsDescr, function (action) {
                self.defs.push(self._createController({
                    $node: $html.find('.oe_action[data-id=' + action.id + '] .oe_complex_content'),
                    actionID: _.str.toNumber(action.name),
                    context: action.context,
                    domain: Domain.prototype.stringToArray(action.domain, {}),
                    viewType: action.view_mode,
                }));
            });
            $html.find('.oe_complexboard_column').sortable({
                connectWith: '.oe_complexboard_column',
                handle: '.oe_header',
                scroll: false
            }).bind('sortstop', function () {
                self.trigger_up('save_dashboard');
            });
            return $html;
        },

        _createController: function (params) {
            var self = this;
            return this._rpc({
                    route: '/web/action/load',
                    params: {action_id: params.actionID}
                })
                .then(function (action) {
                    if (!action) {
                        // the action does not exist anymore
                        return Promise.resolve();
                    }
                    var evalContext = new Context(params.context).eval();
                    if (evalContext.group_by && evalContext.group_by.length === 0) {
                        delete evalContext.group_by;
                    }
                    // tz and lang are saved in the custom view
                    // override the language to take the current one
                    var rawContext = new Context(action.context, evalContext, {lang: session.user_context.lang});
                    var context = pyUtils.eval('context', rawContext, evalContext);
                    var domain = params.domain || pyUtils.eval('domain', action.domain || '[]', action.context);
                    action.context = context;
                    action.domain = domain;
                    var viewType = params.viewType || action.views[0][1];
                    var view = _.find(action.views, function (descr) {
                        return descr[1] === viewType;
                    }) || [false, viewType];
                    return self.loadViews(action.res_model, context, [view])
                               .then(function (viewsInfo) {
                        var viewInfo = viewsInfo[viewType];
                        var View = viewRegistry.get(viewType);
                        var view = new View(viewInfo, {
                            action: action,
                            hasSelectors: false,
                            modelName: action.res_model,
                            searchQuery: {
                                context: context,
                                domain: domain,
                                groupBy: typeof context.group_by === 'string' && context.group_by ? [context.group_by] : context.group_by || [],
                                orderedBy: context.orderedBy || [],
                            },
                            withControlPanel: false,
                        });
                        return view.getController(self).then(function (controller) {
                            self._boardFormViewIDs[controller.handle] = _.first(
                                _.find(action.views, function (descr) {
                                    return descr[1] === 'form';
                                })
                            );
                            self._boardSubcontrollers.push(controller);
                            return controller.appendTo(params.$node);
                        });
                    });
                });
        },

        ////wangjuan设置布局
        _onBarSettingClick: function () {
            this.trigger_up('change_layout');
        },
        ////wangjuan菜单显示
        _onBarMenuClick: function () {
            this.trigger_up('choose_menu');
        },

        getBoard: function () {
            var self = this;
            var board = {
                form_title : this.arch.attrs.string,
                style : this.$('.oe_complexboard').attr('data-layout'),
                columns : [],
            };
            this.$('.oe_complexboard_column').each(function () {
                var actions = [];
                $(this).find('.oe_action').each(function () {
                    var actionID = $(this).attr('data-id');
                    var newAttrs = _.clone(self.actionsDescr[actionID]);

                    /* prepare attributes as they should be saved */
                    if (newAttrs.modifiers) {
                        newAttrs.modifiers = JSON.stringify(newAttrs.modifiers);
                    }
                    actions.push(newAttrs);
                });
                board.columns.push(actions);
            });
            return board;
        },

        // 最小化视图
        _onFoldClick: function (event) {
            var $e = $(event.currentTarget);
            var $action = $e.closest('.oe_action');
            var id = $action.data('id');
            var actionAttrs = this.actionsDescr[id];

            if ($e.is('.oe_minimize')) {
                actionAttrs.fold = '1';
                this.trigger_up('setState', {action:'add' , app: 'product'});
            } else {
                delete(actionAttrs.fold);
                this.trigger_up('setState', {action:'delete' , app: 'product'});
            }
            $e.toggleClass('oe_minimize oe_maximize');
            $action.find('.oe_complex_content').toggle();
            this.trigger_up('save_dashboard');
        },

        // 关闭视图
        _onCloseClick: function (event) {
            var self = this;
            var $container = $(event.currentTarget).parents('.oe_action:first');
            Dialog.confirm(this, (_t("确定要删除吗？")), {
                confirm_callback: function () {
                    $container.remove();
                    self.trigger_up('save_dashboard');
                },
            });
        },

        _onFullScreen: function (event) {
            console.log('event', event);
            var self = this;
            var $container = $(event.currentTarget).parents('.oe_action:first');
            console.log('$container', $container)
            var element = $container[0].ownerDocument.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            }
        },

        _onExitFullScreen: function (event) {
            var $container = $(event.currentTarget).parents('.oe_action:first');

            var document = $container[0].ownerDocument;
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }

        },


        _onFullScreenTest: function (event) {
            var $container = $(event.currentTarget).parents('.oe_action:first');
            this.do_action({
                type: 'ir.actions.client',
                tag: 'fullScreenPage',
                // name: 'test',
                target: 'current'
            }).then(function(){
                $('.o_fullscreen_container').append($container)
            })

        },
    })

    //wangjuan
    var ComplexView = FormView.extend({
        config: _.extend({}, FormView.prototype.config, {
            Controller: ComplexController,
            Renderer: ComplexRenderer,
        }),
        display_name: _lt('Complex'),

        /**
         * @override
         */
        init: function (viewInfo) {
            this._super.apply(this, arguments);
            this.controllerParams.customViewID = viewInfo.custom_view_id;
        },
    });

    return ComplexView;
})

odoo.define('complex.viewRegistry', function (require) {
    "use strict";

    var ComplexView = require('complex.ComplexView');

    var viewRegistry = require('web.view_registry');

    viewRegistry.add('complex', ComplexView);

});