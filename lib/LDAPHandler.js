/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:30 PM
 * To change this template use File | Settings | File Templates.
 */
//var ldap_connection = require('../node-LDAP').Connection,
var LDAP = require('LDAP'),
	colors = require('colors'),
    utils = require('./utils.js').utils;

function LDAPHandler(logger){
    var self = this;

    self.logger = logger;

    //self.logger.log([{msg: self.ldap_time(), color: 'cyan'}, {msg: ' - Creating LDAP handler...', color: null}], 0);
}

LDAPHandler.prototype = {
    ldap_time: function(){
        var self = this;
        return utils.get_time() + ' (ldap)';
    },
    connect: function(callback){
        var self = this;

        self.ldap_config = require('../config/ldap_config.js').ldap;

		self.ldap = new LDAP({ uri: self.ldap_config.host, verision: self.ldap_config.version });

        self.open(callback);
    },
    open: function(cb){
        var self = this;

        self.ldap.open(function(err){
            cb();
        });
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

        self.connect(function(err){
            var bind_options = {
                binddn: 'uid=' + username + ',ou=Users,dc=csh,dc=rit,dc=edu',
                password: password
            };

            self.ldap.simplebind(bind_options, function(msg_id, error){
                if(typeof error == 'undefined'){
    				var search_options = {
    					base: 'ou=Users,dc=csh,dc=rit,dc=edu',
    					filter: "(uid=" + username + ")",
    					scope: '*',
    					subtree: self.ldap.SUBTREE
    				};

                    self.ldap.search(search_options, function(error, data){
                        if(typeof error === 'undefined'){
                            if(data.length > 0){
                                // return user data
                                data = data[0];
                                var user_data = {
                                    username: data.uid[0],
                                    ibutton: ('ibutton' in data && data.ibutton.length > 0) ? data.ibutton[0] : null,
                                    balance: data.drinkBalance[0],
                                    drink_admin: data.drinkAdmin[0]
                                };

                                self.close();
                                callback(user_data);
                            } else {
                                self.close();
                                callback(false);
                            }
                        } else {
                            self.close();
                            callback(false);
                        }
                    });
                } else {
                    self.close();
                    callback(false);
                }
            });
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
        self.connect(function(){
            
            var bind_options = {
                binddn: 'cn=' + self.ldap_config.username + ',ou=Apps,dc=csh,dc=rit,dc=edu',
                password: self.ldap_config.password
            };

            self.ldap.simplebind(bind_options, function(msg_id, error){
                if(typeof error == 'undefined'){
    				var search_options = {
    					base: 'ou=Users,dc=csh,dc=rit,dc=edu',
    					filter: "(ibutton=" + ibutton + ")",
    					scope: '*',
    					subtree: self.ldap.SUBTREE
    				};

                    self.ldap.search(search_options, function(error, data){
                        if(typeof error == 'undefined'){
                            if(data.length > 0){
                                // return user data
                                data = data[0];
                                var user_data = {
                                    username: data.uid[0],
                                    ibutton: data.ibutton[0],
                                    balance: data.drinkBalance[0],
                                    drink_admin: data.drinkAdmin[0]
                                };

                                self.close();
                                callback(user_data);
                            } else {
                                self.close();
                                callback(false);
                            }
                        } else {
                            self.close();
                            callback(false);
                        }
                    });
                } else {
                    self.close();
                    //error binding
                    callback(false);
                }
            });
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
			var bind_options = {
				binddn: 'cn=' + self.ldap_config.username + ',ou=Apps,dc=csh,dc=rit,dc=edu',
				password: self.ldap_config.password
			};

            self.connect(function(){
                self.ldap.simplebind(bind_options, function(msg_id, error){
                    callback(error, msg_id);
                });
            });
        } else {

			var bind_options = {
				binddn: 'uid=' + credentials.username + ',ou=Users,dc=csh,dc=rit,dc=edu',
				password: credentials.password
			};

            self.connect(function(){
                self.ldap.simplebind(bind_options, function(msg_id, error){
                    callback(error, msg_id);
                });
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
        self.auth(auth_type, credentials, function(error, msg_id){
            if(typeof error == 'undefined'){
                var search_query = '';
                if(auth_type == 'ibutton'){
                    search_query = 'ibutton=' + credentials;
                } else {
                    search_query = 'uid=' + credentials.username;
                }

				var search_options = {
					base: 'ou=Users,dc=csh,dc=rit,dc=edu',
					filter: "(" + search_query + ")",
					scope: '*',
					subtree: self.ldap.SUBTREE
				};


                self.ldap.search(search_options, function(error, data){
                    if(typeof error === 'undefined'){
                        if(data.length > 0){
                            self.close();
                            // send the balance in the callback
                            callback(data[0].drinkBalance[0]);
                        } else {
                            self.close();
                            callback(false);
                        }
                    } else {
                        self.close();
                        callback(false);
                    }
                });
            } else {
                // error
                self.close();
                callback(false);
            }
        });
    },
    user_exists: function(username, callback){
        var self = this;

        var auth_type = 'drink';
        var credentials = null;

        self.auth(auth_type, credentials, function(error, msg_id){
            if(typeof error == 'undefined'){
                var search_query = 'uid=' + username;
				
				var search_options = {
					base: 'ou=Users,dc=csh,dc=rit,dc=edu',
					filter: "(" + search_query + ")",
					scope: '*',
					subtree: self.ldap.SUBTREE
				};

                self.ldap.search(search_options, function(error, data){
                    if(typeof error == 'undefined'){
                        if(data.length > 0){
                            self.close();
                            // send the balance in the callback
                            callback(data[0]);
                        } else {
                            self.close();
                            callback(false);
                        }

                    } else {
                        self.close();
                        callback(false);
                    }
                });
            } else {
                // error
                self.close();
                callback(false);
            }
        });
    },
    update_balance: function(uid, new_balance, callback){
        var self = this,
            auth_type = 'drink',
            dn = 'uid=' + uid + ',ou=Users,dc=csh,dc=rit,dc=edu',
            bal = [
                {
                    attr: "drinkBalance",
                    vals: [new_balance]
                }
            ];

        self.auth(auth_type, null, function(error, msg_id){
            if(typeof error === 'undefined'){

                self.ldap.modify(dn, bal, function(error){
                    self.close();
                    callback(error);
                });
            } else {
                // handle error
                self.close();
            }
        });
    }
};

exports.LDAPHandler = LDAPHandler;
