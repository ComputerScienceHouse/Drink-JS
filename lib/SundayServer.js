var LDAPHandler = require('./LDAPHandler.js').LDAPHandler;
var drink_db = require('./MySQLHandler.js').MySQLHandler;

var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');


function SundayServer(socket_server, logger, config, sunday_config){
    var self = this;

    self.logger = logger;

    // record the start time for analysis
    self.time_started = new Date().toUTCString();

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
            return util.get_time() + ' (sunday : ' + conn.username + ')';
        } else {
            return util.get_time() + ' (sunday)';
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
            switch_user: null,
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

        if(self.machine_server.is_valid_machine(command[1])){
            conn.current_machine_alias = command[1];

            self.logger.log([{msg: self.sunday_time(conn), color: 'cyan'}, {msg: ' - Changing machine to ' + self.machine_server.get_name_for_machine([command[1]]), color: null}], 0);

            self.send_msg_code('OK', socket, ' Welcome to ' + self.machine_server.get_name_for_machine([command[1]]));

        } else {
            self.send_msg_code('414', socket, ' - USAGE: MACHINE < d | ld | s >');
        }
    },
    GETBALANCE: function(command, socket, conn){

    }

};

exports.SundayServer = SundayServer;