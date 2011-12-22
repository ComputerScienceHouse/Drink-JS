var LDAPHandler = require('./LDAPHandler.js').LDAPHandler;
var drink_db = require('./MySQLHandler.js').MySQLHandler;

var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');


function SundayServer(socket_server, logger, config, sunday_config){
    var self = this;

    // record the start time for analysis
    self.time_started = new Date().toUTCString();

    // instance of the socket server
    self.server = socket_server;

    // parse the config file
    self.error_codes = config.error_codes;

    self.machine_aliases = config.machine_codes;
    self.machine_ip_mapping = config.machine_ip_mapping;
    self.sunday_config = sunday_config;
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
    init: function(){
        var self = this;

        // setup the server
        self.server.listen('port', 'host', function(socket){
            self.setup_connection_handler(socket);
        });

    },
    setup_connection_handler: function(socket){
        var self = this;

        // instance of the users connection
        var conn = {
            // this is used to hold the username the user is trying to authenticate with
            switch_user: null,
            // username is only set once the user is confirmed as logged in
            username: null,
            password: null,
            ibutton: null,
            // auth_type: user || ibutton
            auth_type: null,
            authenticated: false,
            current_machine: null,
            balance: 0,
            ldap_handler: new LDAPHandler(self.logger)
        };

        socket.on('connect', function(data){
            self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - Client connected from ' + socket.remoteAddress, color: null}], 0);

            var default_machine_name = 'Drink';
            // TODO - fix this in the machine server
            /*if(socket.address().address in self.machine_ip_mapping){
                conn.current_machine = self.machine_ip_mapping[socket.address().address];

                default_machine_name = self.machine_server.machines[conn.current_machine].long_name;
            } else {
                conn.current_machine = 'd';
            }

            socket.write("Welcome to " + machine_name + "\n");*/
        });

        socket.on('data', function(data){
            var str_data = data.toString();

            // TODO - implement all this

            // remove CRLF
            /*str_data = str_data.replace("\n", "").replace("\r", "");

            // split on space to get commands
            var tokenized_data = str_data.split(" ");

            if(tokenized_data.length > 0){
                tokenized_data[0] = tokenized_data[0].toUpperCase();
                if(tokenized_data[0] in self){
                    self[tokenized_data[0]](tokenized_data, socket, conn);
                } else {
                    self.send_msg_code('415', socket);
                }
            } else {
                self.send_msg_code('415', socket);
            }*/

        });

        socket.on('close', function(data){
            // TODO - Make this pretty
            console.log("Client socket closed");
        });

        socket.on('timeout', function(data){
            // TODO - Make this pretty
            console.log("Client socket timedout");
        });

        socket.on('error', function(data){
            // TODO - Make this pretty
            console.log("Client socket error");
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
            util.print_error(e, 'sunday - send_msg_code');
        }

        return;
    },
    /**************************************************************************
     | Sunday Protocol Opcodes
     *************************************************************************/
    UPTIME: function(command, socket, conn){
        var self = this;

        self.send_msg_code('OK', socket, 'Running since: ' + self.time_started);
    },
    WHOAMI: function(command, socket, conn){
        var self = this;

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

        /*if(command[1] in self.machine_server.machines){
            conn.current_machine = command[1];

            self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - Changing machine to ' + self.machine_server.machines[command[1]].long_name, color: null}], 0);

            self.send_msg_code('OK', socket, ' Welcome to ' + self.machine_server.machines[command[1]].long_name);

        } else {
            self.send_msg_code('414', socket, ' - USAGE: MACHINE < d | ld | s >');
        }*/
    },
    GETBALANCE: function(command, socket, conn){

    }

};

exports.SundayServer = SundayServer;