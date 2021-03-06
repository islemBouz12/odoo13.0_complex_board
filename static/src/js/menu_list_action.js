 /**
     * Description：menu action
     * Date: 2019.11.12
     * Updater: wangjuan04@inspur.com
 */
odoo.define('complex_board.menuList', function (require) {
    "use strict";

    var core = require('web.core');
    var config = require('web.config');
    var session = require('web.session');
    var AbstractAction = require('web.AbstractAction');
    var _t = core._t;
    var QWeb = core.qweb;

    var ComplexMenusPage = AbstractAction.extend({
        contentTemplate: 'ComplexMenus',
        init: function(parent, action){
            this._super.apply(this, arguments);
            this.name = "功能导航";
            this.menuList = [];  // 一二级菜单数据
            this.thirdMenu = []; // 三四级菜单数据
            this.isOpen = true;
        },
        willStart: function(){
            var self = this;
            return this._super.apply(this,arguments).then(function(){
                return self.load();
            })
        },
        // info:init menu data author：wang juan date：2019/11/20
        load: function () {
            var self = this;
            return this._rpc({
                model: 'ir.ui.menu',
                method: 'load_upper_menus',
                args: [config.debug],
                context: session.user_context,
            }).then(function(result) {
                self.menuList= result.children;
            });
        },
        events: {
            'click .oe_second_menu_item': "_onMenuClik",
            'click .oe_first_menu_item_toggle': "_onIconClick",
            'click .oe_fourth_menu_item_icon': "_onCollectClick",
            'click .oe_menu_detail_menu': "_onDetailClick",
            'click .oe_menu_topBar_close': "_onCloseMenuList"
        },

        // info:second menu click event  author：wang juan  date：2019/11/20
        _onMenuClik: function(ev){
            const itemId = ev.currentTarget.attributes['itemId'].nodeValue;
            return this._rpc({
                model: 'ir.ui.menu',
                method: 'load_module_menus',
                args: [itemId,config.debug],
                context: session.user_context,
            }).then(function(result) {
                self.menuDetail= result.children;
                var $el = QWeb.render('Complex.menuDetails', {
                    widget: this,
                    thirdMenu: result.children,
                });
                $(".oe_menu_detail_row").replaceWith($el);
            });
        },
        // info:toggle menu  author：wang juan  date：2019/11/20
        _onIconClick: function(){
            if(this.isOpen){
                $(".oe_first_menu_item_open").replaceWith('<img src="/odoo_complex_board/static/src/img/jiantou-down.png" alt="箭头" class="oe_first_menu_item_close collapsed" data-toggle="collapse" data-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne"/>');
            } else {
                $(".oe_first_menu_item_close").replaceWith('<img src="/odoo_complex_board/static/src/img/jiantou.png" alt="箭头" class="oe_first_menu_item_open collapsed" data-toggle="collapse" data-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne"/>');
            }
            this.isOpen = !this.isOpen;
        },

        // info:toggle menu star  author：wang juan  date：2019/11/21
        _onCollectClick: function(ev){
            console.log(ev)
            var self = this;
            const collectStatus = ev.currentTarget.attributes['status'].nodeValue;
            const collectId = ev.currentTarget.attributes['id'].nodeValue;
            const actionId = ev.currentTarget.attributes['action'].nodeValue.split(',')[1];
            const name = ev.currentTarget.attributes['name'].nodeValue;
            // const menu
            if(collectStatus === "true"){  
                this._rpc({
                    model: 'ir.ui.menu',
                    method: 'uncollect',
                    args: [collectId],
                }).then(function(result) {
                    ev.currentTarget.attributes['status'].nodeValue = "false"
                    $("."+ "oe_fourth_menu_item_icon"+collectId).html('<img src="/odoo_complex_board/static/src/img/canclestar.png"  alt="取消收藏"/>')
                    self._rpc({
                        route: '/complex/remove_from_complexboard',
                        params: {
                            action_id: actionId ,
                        },
                    })
                })
            } else {
                this._rpc({
                    model: 'ir.ui.menu',
                    method: 'collect',
                    args: [collectId],
                }).then(function(result) {
                    ev.currentTarget.attributes['status'].nodeValue = "true"
                    $("."+ "oe_fourth_menu_item_icon"+collectId).html(' <img src="/odoo_complex_board/static/src/img/star.png"  alt="收藏" />')
                    self._rpc({
                        route: '/complex/add_to_complexboard',
                        params: {
                            action_id: actionId ,
                            context_to_save: {},
                            domain:[],
                            view_mode: 'list',
                            name: name,
                            mode: 2,
                        },
                    })
                })
            }
        },

        // info:detail menu click event  author：wang juan  date：2019/11/21
        _onDetailClick: function(ev){
            const detailId = ev.currentTarget.attributes['id'].nodeValue;
            const detailAction = ev.currentTarget.attributes['action'].nodeValue.split(",")[1];
            if (detailAction) {
                this.trigger_up('menu_clicked',{
                    id: detailId,
                    action_id: detailAction,
                });
            }
        },

        // info:detail menu close click event  author：wang juan  date：2019/11/22
        _onCloseMenuList: function(ev){
            var self = this;
            self._rpc({
                model: 'ir.ui.menu',
                method: 'load_homepage',
                args: [1],
            }).then(function (result) {
                if (result) {
                    self.trigger_up('menu_clicked', {
                        id: result[0],
                        action_id: result[1],
                    });   
                }
            });
        }
    })
    core.action_registry.add('ComplexMenusPage', ComplexMenusPage);
    return ComplexMenusPage
})