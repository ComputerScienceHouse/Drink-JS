/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:30 PM
 * To change this template use File | Settings | File Templates.
 */
var ldap_connection = require('../node-LDAP').Connection;
var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');

function LDAPHandler(logger){
    var self = this;

    self.logger = logger;

    self.logger.log([{msg: self.ldap_time(), color: 'cyan'}, {msg: ' - Creating LDAP handler...', color: null}], 0);
}

LDAPHandler.prototype = {
    ldap_time: function(){
        var self = this;
        return util.get_time() + ' (ldap)';
    },
    connect: function(){
        var self = this;

        self.ldap_config = require('../configs/ldap_config.js').ldap;
        self.ldap = new ldap_connection();

        self.ldap.open(self.ldap_config.host, self.ldap_config.version);
    },
    close: function(){
        var self = this;
        self.ldap.close();
    }
};

exports.LDAPHandler = LDAPHandler;