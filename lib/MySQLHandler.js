/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:31 PM
 * To change this template use File | Settings | File Templates.
 */

var colors = require('colors'),
    utils = require('./utils.js').utils,
    util = require('util'),
    mysql = require('mysql'),
    config = require('../configs/mysql_config.js').mysql;

function MySQLHandler(){
    var self = this;

    self.database = 'drink_v2';
    self.client = null;


    self.init();
}

MySQLHandler.prototype = {
    init: function(){
        var self = this;
        util.puts(self.db_time().yellow + ' - Connecting to drink db');

        self.client = mysql.createClient({
            user: config.user,
            password: config.password,
            host: config.host
        });

        self.client.query('USE drink_v2');
    },
    db_time: function(){
        var self = this;
        return utils.get_time() + ' (drink_db)';
    }
};

exports.MySQLHandler = new MySQLHandler();