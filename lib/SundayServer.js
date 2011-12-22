/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:07 PM
 * To change this template use File | Settings | File Templates.
 */
/*var net = require('net');
var tls = require('tls');
var LDAPHandler = require('./ldap.js').LDAPHandler;
var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');
var drink_db = require('./mysql.js').DB;*/

function SundayServer(socket_server, logger){
    var self = this;

    self.socket_server = socket_server;

}

SundayServer.prototype = {
    sunday_time: function(conn){
        var self = this;

        if(typeof conn != 'undefined' && conn.authenticated == true){
            return util.get_time() + ' (sunday : ' + conn.username + ')';
        } else {
            return util.get_time() + ' (sunday)';
        }

    },
    setup_connection_handler: function(){
        var self = this;
    }
};

exports.SundayServer = SundayServer;