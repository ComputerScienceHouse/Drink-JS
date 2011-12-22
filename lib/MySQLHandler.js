/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:31 PM
 * To change this template use File | Settings | File Templates.
 */

var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');
var mysql = require('mysql');
var config = require('../configs/mysql_config.js').mysql;

function MySQLHandler(){
    var self = this;

    self.database = 'drink_v2';
    self.client = null;


    self.init();
}

MySQLHandler.prototype = {
    init: function(){
        var self = this;
        sys.puts(self.db_time().yellow + ' - Connecting to drink db');

        self.client = mysql.createClient({
            user: config.user,
            password: config.password,
            host: config.host
        });

        self.client.query('USE drink_v2');
    },
    db_time: function(){
        var self = this;
        return util.get_time() + ' (drink_db)';
    }
};

exports.MySQLHandler = new MySQLHandler();