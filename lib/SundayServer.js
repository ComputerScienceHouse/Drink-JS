var LDAPHandler = require('./LDAPHandler.js').LDAPHandler,
    drink_db = require('./MySQLHandler.js').MySQLHandler,
    colors = require('colors'),
    utils = require('./utils.js').utils;

function SundayServer(socket_server, logger, config, sunday_config){
    var self = this;

    self.logger = logger;

    // record the start time for analysis
    self.time_started = utils.get_time();

    // instance of the socket server
    self.server = socket_server;

    // parse the config file
    self.error_codes = config.error_codes;

    self.machine_aliases = config.machine_codes;
    self.machine_ip_mapping = config.machine_ip_mapping;
    self.sunday_config = sunday_config;
    self.machine_server = null;
    self.sunday_opcodes = config.sunday_opcodes;
}

SundayServer.prototype = {
    is_valid_opcode: function(opcode){
        var self = this;

        for(var i = 0; i < self.sunday_opcodes.length; i++){
            if(opcode == self.sunday_opcodes[i]){
                return true;
            }
        }

        return false;
    },
    sunday_time: function(conn){
        var self = this;

        if(typeof conn != 'undefined' && conn.authenticated == true){
            return utils.get_time() + ' (sunday : ' + conn.username + ')';
        } else {
            return utils.get_time() + ' (sunday)';
        }

    },
    init: function(){
        var self = this;
        // setup the server
        self.server.listen(self.sunday_config.port, self.sunday_config.host);

        self.server.on('connection', function(socket){
            self.setup_connection_handler(socket);
        });

    },
    set_machine_server: function(machine_server){
        var self = this;

        self.machine_server = machine_server;

    },
    setup_connection_handler: function(socket){
        var self = this;

        // instance of the users connection
        var conn = {
            // this is used to hold the username the user is trying to authenticate with
            switch_username: null,
            // username is only set once the user is confirmed as logged in
            username: null,
            password: null,
            ibutton: null,
            // auth_type: user || ibutton
            auth_type: null,
            authenticated: false,
            current_machine_alias: null,
            balance: 0,
            ldap_handler: new LDAPHandler(self.logger)
        };

        socket.on('connect', function(data){
            self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - Client connected from ' + socket.remoteAddress, color: null}], 0);

            var default_machine_name = 'Drink';

            if(socket.address().address in self.machine_ip_mapping){
                conn.current_machine_alias = self.machine_ip_mapping[socket.address().address];

                default_machine_name = self.machine_server.get_name_for_machine(conn.current_machine_alias);
            } else {
                conn.current_machine_alias = 'd';
            }

            socket.write("Welcome to " + default_machine_name + "\n");
        });

        socket.on('data', function(data){
            var str_data = data.toString();

            // remove CRLF
            str_data = str_data.replace("\n", "").replace("\r", "");

            // split on space to get commands
            var tokenized_data = str_data.split(" ");

            if(tokenized_data.length > 0){
                tokenized_data[0] = tokenized_data[0].toUpperCase();
                if(self.is_valid_opcode(tokenized_data[0])){
                    // call the opcode function
                    self[tokenized_data[0]](tokenized_data, socket, conn);
                } else {
                    // otherwise its an incorrect opcode
                    self.send_msg_code('415', socket);
                }
            } else {
                self.send_msg_code('415', socket);
            }

        });

        socket.on('close', function(data){
            // TODO - Make this pretty
            //console.log("Client socket closed");
        });

        socket.on('timeout', function(data){
            // TODO - Make this pretty
            //console.log("Client socket timedout");
        });

        socket.on('error', function(data){
            // TODO - Make this pretty
            //console.log("Client socket error");
        });
    },
    send_msg_code: function(code, socket, message){
        var self = this;
        var error_msg = self.error_codes[code];

        if(typeof message != 'undefined'){
            error_msg += message;
        }

        try {
            socket.write(error_msg + "\r\n");
        } catch (e){
            utils.print_error(e, 'sunday - send_msg_code');
        }

        return;
    },
    send_json_msg: function(socket, payload){
        var self = this;

        if(typeof payload == 'undefined'){
            payload = {};
        }

        try {
            socket.write(JSON.stringify(payload) + "\r\n");
        } catch (e){
            utils.print_error(e, 'sunday - send_json_msg');
        }

        return;
    },
    /**************************************************************************
     | Sunday Protocol Opcodes
     *************************************************************************/
    SERVERSTAT: function(command, socket, conn){
        var self = this;

        var machine_stats = {};

        machine_stats.machines = [];

        for(var i in self.machine_server.machines){
            machine_stats.machines.push({
                machine_name: self.machine_server.machines[i].machine_inst.long_name,
                connected: self.machine_server.machines[i].machine_inst.connected
            });
        }

        machine_stats.opcode = "OK";

        self.send_json_msg(socket, machine_stats);
    },
    UPTIME: function(command, socket, conn){
        var self = this;

        self.send_msg_code('OK', socket, 'Up since: ' + self.time_started);
    },
    SENDCREDITS: function(command, socket, conn){
        var self = this;

        if(command.length != 3){
            self.send_msg_code('206', socket, ' - USAGE: SENDCREDITS <(int) num credits> <username>');
            return;
        }

        if(conn.authenticated != true){
            self.send_msg_code('204', socket);
            return;
        }

        try {
            command[1] = parseInt(command[1]);
        } catch (e){
            self.send_msg_code('206', socket, ' - USAGE: SENDCREDITS <num credits> <username>');
            return;
        }

        conn.ldap_handler.user_exists(command[2], function(user){
            if(user !== false){
                // check to see that the sending user has enough credits
                if(conn.balance >= command[1]){
                    var new_bal = parseInt(user.drinkBalance[0]) + command[1];

                    conn.ldap_handler.update_balance(user.uid[0], new_bal, function(msg_id, err){
                        if(err == null){
                            conn.balance -= command[1];
                            conn.ldap_handler.update_balance(conn.username, conn.balance, function(msg_id, err){
                                if(err == null){
                                    self.send_msg_code('OK', socket);
                                } else {
                                    self.send_msg_code('209', socket, ' - Error deducting credits from sending user');
                                }
                            });
                        } else {
                            self.send_msg_code('209', socket, ' - Error transferring credits to user');
                        }
                    });
                } else {
                    self.send_msg_code('203', socket);
                }
            } else {
                self.send_msg_code('208', socket);
            }
        });


    },
    WHOAMI: function(command, socket, conn){
        var self = this;

        if(conn.authenticated == true){
            self.send_msg_code('OK', socket, ' ' + conn.username)
        } else {
            self.send_msg_code('204', socket);
        }
    },
    QUIT: function(command, socket, conn){
        socket.end("Good Bye\r\n");
    },
    MACHINE: function(command, socket, conn){
        var self = this;

        if(command.length != 2){
            self.send_msg_code('206', socket, ' - USAGE: MACHINE < d | ld | s >');
            return;
        }

        if(self.machine_server.is_valid_machine(command[1])){
            conn.current_machine_alias = command[1];

            self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - Changing machine to ' + self.machine_server.get_name_for_machine([command[1]]), color: null}], 0);

            self.send_msg_code('OK', socket, ' Welcome to ' + self.machine_server.get_name_for_machine([command[1]]));

        } else {
            self.send_msg_code('414', socket, ' - USAGE: MACHINE < d | ld | s >');
        }
    },
    GETBALANCE: function(command, socket, conn){
        var self = this;
        if(conn.authenticated != true){
            self.send_msg_code('204', socket);
            return;
        }

        var credentials = null;

        if(conn.auth_type == 'ibutton'){
            credentials = conn.ibutton;
        } else {
            credentials = {username: conn.username, password: conn.password};
        }

        conn.ldap_handler.get_balance(conn.auth_type, credentials, function(balance){
            if(balance !== false){
                self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - GETBALANCE ' + conn.username + ' : ' + balance, color: null}], 0);
                conn.balance = balance;
                self.send_msg_code('OK', socket, balance);
            } else {
                console.log('sending 204');
                self.send_msg_code('204', socket);
            }
        });
    },
    /**
     * Sets a username to be authenticated
     *
     * @param command   Tokenized command with arguments - USER <username>
     * @param socket    Reference to the current clients socket
     * @param conn      Reference to the current clients connection session object
     */
    USER: function(command, socket, conn){
        var self = this;

        if(command.length != 2){
            self.send_msg_code('206', socket, ' USAGE: PASS <username>');
            return;
        }

        // store the username
        if(conn.username != command[1]){
            conn.switch_username = command[1];
        }

        self.send_msg_code('OK', socket);

    },
    /**
     * Sets a password to be authenticated. Requires a username first. Authenticates against LDAP when provided
     *
     * @param command   Toeknized command with arguments - PASS <password>
     * @param socket    Reference to the current clients socket
     * @param conn      Reference to the current clients connection session object
     */
    PASS: function(command, socket, conn){
        var self = this;

        // check for invalid arg count
        if(command.length != 2){
            self.send_msg_code('206', socket, ' USAGE: PASS <username>');
            return;
        }

        // need username first
        if(conn.switch_username == null){

            self.send_msg_code('201', socket);
        }

        // check the username/password against ldap
        conn.ldap_handler.auth_user(conn.switch_username, command[1], function(result){
            // result is the error code (if any) returned by the LDAP bind.
            // if the result is null, authentication was successful
            if(result != false){
                conn.password = command[1];
                conn.ibutton = result.ibutton;
                conn.is_admin = false;
                conn.authenticated = true;
                conn.auth_type = 'user';
                conn.username = result.username;
                conn.balance = result.balance;

                conn.switch_username = null;

                conn.drop_in_progress = false;

                self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - Authenticated ' + conn.ibutton + ' (' + conn.username + ')', color: null}], 0);

                self.send_msg_code('OK', socket, conn.balance);

            } else {
                self.send_msg_code('407', socket);
            }
        });

    },
    /**
     * Sets the ibutton to authenticate against. Will use the Drink ldap user to check if ibutton is valid and
     * authenticate user,
     *
     * @param command   Tokenized command with arguments = IBUTTON <ibutton>
     * @param socket    Reference to the current clients socket
     * @param conn      Reference to the current clients connection session object
     */
    IBUTTON: function(command, socket, conn){
        var self = this;

        // make sure someone isnt sneaking in other shit
        command[1] = command[1].replace(/[^a-zA-Z 0-9]+/g,'');

        if(command.length != 2){
            self.send_msg_code('206', socket, ' - USAGE: IBUTTON <ibutton number>');
            return;
        }

        conn.ldap_handler.auth_ibutton(command[1], function(result){
            if(result != false){
                conn.ibutton = result.ibutton;
                conn.is_admin = false;
                conn.authenticated = true;
                conn.auth_type = 'ibutton';
                conn.username = result.username;
                conn.balance = result.balance;

                self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - Authenticated ' + conn.ibutton + ' (' + conn.username + ')', color: null}], 0);

                self.send_msg_code('OK', socket, conn.balance);
            } else {
                utils.print_error('Could not authenticate ' + command[1], 'sunday - ibutton');
                self.send_msg_code('207', socket);
            }
        });
    },
    DROP: function(command, socket, conn){
        var self = this;

        if(conn.current_machine_alias == null){
            self.send_msg_code('413', socket);
            return;
        }

        var drop_slot = null;

        // check to see that slot number is an int
        drop_slot = parseInt(command[1]);
        if(isNaN(drop_slot)){
            self.send_msg_code('409', socket);
            return;
        }

        // check to see that delay (if there is one) is an int
        var drop_delay = 0;

        if(command.length == 3){
            drop_delay = parseInt(command[2]);
            if(isNaN(drop_delay)){
                self.send_msg_code('403', socket);
                return;
            }

        }

        if(conn.drop_in_progress == true){
            self.logger.log([{msg: self.sunday_time(), color: 'grey'}, {msg: ' - ' + conn.username + ' trying to drop simultaneously', color: 'grey'}], 0);
            //self.logger.log([{msg: self.sunday_time(), color: 'gray'}, {msg:' - STAT', color: null}], 0);
            self.send_msg_code('152', socket);
            return;
        }

        // check to make sure the machine is connected
        if(self.machine_server.machines[conn.current_machine_alias].connected == true){
            drink_db.get_status_for_slot(conn.current_machine_alias, command[1], function(slot){

                // check to make sure slot is "real"
                if(slot != null && slot != false){

                    // check to see if slot is not empty and is enabled
                    if(slot.available > 0 && slot.status == 'enabled'){

                        //check to see if user has the funds
                        if(parseInt(conn.balance) >= parseInt(slot.item_price)){
                            // set drop_in_progress to "true" to prevent user from trying to drop MANY things at the same time
                            conn.drop_in_progress = true;

                            // send DROP command to tini
                            self.machine_server.machines[conn.current_machine_alias].machine_inst.drop(drop_slot, drop_delay, function(drop_response){
                                var response = '';

                                try {
                                    response = drop_response[0];
                                }
                                catch(e){
                                    utils.print_error(e, 'sunday - parsing drop response');
                                }

                                if(response == '4'){
                                    // drop successful, deduct credits
                                    var new_balance = parseInt(conn.balance) - parseInt(slot.item_price);
                                    conn.ldap_handler.update_balance(conn.username, new_balance, function(msgid, err){
                                        if(err == null){
                                            // log drop to drink db
                                            drink_db.get_machine_id_for_alias(conn.current_machine_alias, function(machine_id){
                                                if(machine_id != null){
                                                    drink_db.log_drop(machine_id, conn.username, drop_slot, slot.item_id, parseInt(slot.item_price), 'ok', function(res){
                                                        conn.drop_in_progress = false;
                                                        self.send_msg_code('OK', socket, ' Dropping drink');

                                                        // check the hardware for slot availability only if the machine has a sensor
                                                        if(self.machine_server.machines[conn.current_machine_alias].has_sensor == true){
                                                            self.machine_server.machines[conn.current_machine_alias].machine_inst.check_slot_availability();
                                                        }

                                                    });
                                                } else {
                                                    conn.drop_in_progress = false;
                                                    self.send_msg_code('103', socket, ' Bad Machine ID');
                                                }
                                            });
                                        } else {
                                            conn.drop_in_progress = false;
                                            // something happened oh noes!!
                                            self.send_msg_code('103', socket, ' LDAP Error');
                                        }
                                    });
                                } else if(response == '6'){
                                    conn.drop_in_progress = false;
                                    self.send_msg_code('151', socket);
                                    return;

                                } else {
                                    conn.drop_in_progress = false;
                                    // couldnt drop drink from slot
                                    self.send_msg_code('150', socket);
                                    return;
                                }
                            });

                        } else {
                            // user is poor
                            self.send_msg_code('203', socket);
                            return;
                        }

                    } else {
                        // slot is disabled
                        if(slot.status == 'disabled'){
                            self.send_msg_code('102', socket);
                        }

                        // slot is empty
                        if(slot.available == 0){
                            self.send_msg_code('100', socket);
                        }

                        return;
                    }
                } else {
                    if(slot == false){
                        self.send_msg_code('105', socket);
                    } else {
                        // error - slot not available or something
                        self.send_msg_code('103', socket, 'Slot not available or something');
                        return;
                    }
                }
            });
        } else {
            self.send_msg_code('151', socket);
        }
    },
    STAT: function(command, socket, conn){
        var self = this;
        self.logger.log([{msg: self.sunday_time(), color: 'cyan'}, {msg:' - STAT', color: null}], 0);

        drink_db.get_stat_for_machine(conn.current_machine_alias, function(err, stats){
            if(err == null){
                var stat_string = '';

                for(var i = 0; i < stats.length; i++){
                    var status = (stats[i].status == 'enabled') ? 1 : 0;
                    stat_string += stats[i].slot_num + ' "' + stats[i].item_name + '" ' + stats[i].item_price + ' ' + stats[i].available + ' ' + status + "\n";
                }

                stat_string += "OK " + stats.length + " Slots retrieved";

                self.send_msg_code("OK_ALT", socket, stat_string);

            } else {
                // error getting stat
                self.send_msg_code("416", socket);
            }
        });
    }
};

exports.SundayServer = SundayServer;