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
    },
    /**
     * Authenticate a user using their username/password by attempting to bind to ldap
     *
     * @param username          Users CSH username
     * @param password          Users CSH password
     * @param callback(authed)  True for authed, false on fail
     */
    auth_user: function(username, password, callback){
        var self = this;
        self.connect();

        self.ldap.simpleBind('uid=' + username + ',ou=Users,dc=csh,dc=rit,dc=edu', password, function(msg_id, error){
            if(error == null){
                self.ldap.search('ou=Users,dc=csh,dc=rit,dc=edu', self.ldap.SUBTREE, "(uid=" + username + ")", "*", function(msg, error, data){
                    if(error == null){
                        if(data.length > 0){
                            // return user data
                            data = data[0];
                            var user_data = {
                                username: data.uid[0],
                                ibutton: data.ibutton[0],
                                balance: data.drinkBalance[0],
                                drink_admin: data.drinkAdmin[0]
                            };

                            callback(user_data);
                            self.close();
                        } else {
                            callback(false);
                            self.close();
                        }
                    } else {
                        callback(false);
                        self.close();
                    }
                });
            } else {
                callback(false);
                self.close();
            }
        });
    },
    /**
     * Authorize a user based on iButton. Search LDAP as drink user to find a user that the ibutton is associated with.
     *
     * If it is a valid ibutton, return that users username, otherwise return false.
     * @param ibutton
     * @param callback
     */
    auth_ibutton: function(ibutton, callback){
        var self = this;
        self.connect();
        self.ldap.simpleBind('cn=' + self.ldap_config.username + ',ou=Apps,dc=csh,dc=rit,dc=edu', self.ldap_config.password, function(msg_id, error){
            if(error == null){
                self.ldap.search('ou=Users,dc=csh,dc=rit,dc=edu', self.ldap.SUBTREE, "(ibutton=" + ibutton + ")", "*", function(msg, error, data){
                    if(error == null){
                        if(data.length > 0){
                            // return user data
                            data = data[0];
                            var user_data = {
                                username: data.uid[0],
                                ibutton: data.ibutton[0],
                                balance: data.drinkBalance[0],
                                drink_admin: data.drinkAdmin[0]
                            };

                            callback(user_data);
                            self.close();
                        } else {
                            callback(false);
                            self.close();
                        }
                    } else {
                        callback(false);
                        self.close();
                    }
                });
            } else {
                //error binding
                callback(false);
                self.close();
            }
        });
    },
    /**
     * Used to authenticate a user via ibutton or username/password then run another LDAP operation
     *
     * @param auth_type         Type of authentication: ibutton || user
     * @param credentials       Credentials:            ibutton || {username: 'username', password: 'password'}
     * @param callback          Callback to run after authenticated.
     */
    auth: function(auth_type, credentials, callback){
        var self = this;

        if(auth_type == 'ibutton' || auth_type == 'drink'){
            self.ldap.simpleBind('cn=' + self.ldap_config.username + ',ou=Apps,dc=csh,dc=rit,dc=edu', self.ldap_config.password, function(msg_id, error){
                callback(error, msg_id);
            });
        } else {
            self.ldap.simpleBind('uid=' + credentials.username + ',ou=Users,dc=csh,dc=rit,dc=edu', credentials.password, function(msg_id, error){
                callback(error, msg_id);
            });
        }
    },
    /**
     * Get the balance for the given user. Authentication can be by ibutton or username/password
     *
     * @param auth_type         Type of authentication: ibutton || user
     * @param credentials       Credentials:            ibutton || {username: 'username', password: 'password'}
     * @param callback(result)  Result will be number of credits or false
     */
    get_balance: function(auth_type, credentials, callback){
        var self = this;
        self.connect();
        self.auth(auth_type, credentials, function(error, msg_id){
            if(error == null){
                var search_query = '';
                if(auth_type == 'ibutton'){
                    search_query = 'ibutton=' + credentials;
                } else {
                    search_query = 'uid=' + credentials.username;
                }

                self.ldap.search('ou=Users,dc=csh,dc=rit,dc=edu', self.ldap.SUBTREE, "(" + search_query + ")", "*", function(msg, error, data){
                    if(error == null){
                        if(data.length > 0){
                            // send the balance in the callback
                            callback(data[0].drinkBalance[0]);
                            self.close();
                        } else {
                            callback(false);
                            self.close();
                        }
                    } else {
                        callback(false);
                        self.close();
                    }
                });
            } else {
                // error
                self.close();
            }
        });
    },
    update_balance: function(uid, new_balance, callback){
        var self = this;
        self.connect();
        var auth_type = 'drink';

        var dn = 'uid=' + uid + ',ou=Users,dc=csh,dc=rit,dc=edu';

        var bal = [
            {
                type: "drinkBalance",
                vals: [new_balance]
            }
        ];

        self.auth(auth_type, null, function(error, msg_id){
            if(error == null){
                self.ldap.modify(dn, bal, function(msg_id, error){
                    callback(msg_id, error);
                    self.close();
                });
            } else {
                // handle error
                self.close();
            }
        });
    },
    transfer_credits: function(send_uid, recv_uid, credits, callback){
        var self = this;
        self.connect();

        //self.update_balance(send_uid, )

    }
};

exports.LDAPHandler = LDAPHandler;