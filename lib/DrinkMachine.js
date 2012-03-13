/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/22/11
 * Time: 12:11 AM
 * To change this template use File | Settings | File Templates.
 */
var net = require('net'),
    colors = require('colors'),
    util = require('util'),
    drink_db = require('./MySQLHandler.js').MySQLHandler,
    utils = require('./utils.js').utils;


function Request(command, callback, command_data){
    var self = this;

    if(typeof command_data == 'undefined'){
        command_data = {};
    }

    self.command = command;
    self.callback = callback;
    self.command_data = command_data;
}

Request.prototype.run_callback = function(callback_data){
    var self = this;

    self.callback(callback_data);
};

Request.prototype.run_command = function(){
    var self = this;

    self.command(self.command_data);
};

function DrinkMachine(conn, logger){
    var self = this;

    self.logger = logger;

    self.machine_id = conn.machine.machine_id;
    self.long_name = conn.machine.long_name;
    self.connected = conn.machine.connected;
    self.socket = conn.socket;
    self.has_sensor = conn.machine.has_sensor;
    self.machine_authenticated = conn.authenticated;

    self.TIMEOUT = 10000;
    self.init_request_data();

    self.connection_timeout_id = null;

    self.init();

    self.recv_msg = '';

    self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg:' - ' + self.socket.remoteAddress, color: null}], 0);

    if(self.has_sensor == true){
        self.check_slot_availability();
    }
}


DrinkMachine.prototype = {
    init_request_data: function(){
        var self = this;

        self.current_request = null;
        self.request_queue = [];
        self.requesting = false;
        self.timeout_id = null;

    },
    machine_time: function(){
        var self = this;
        return utils.get_time() + ' (' + self.long_name + ')';
    },
    reinit: function(socket){
        var self = this;
        self.connected = true;
        self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg:' - Re-Initializing ' + self.long_name + ' server', color: null}], 0);

        self.socket.removeAllListeners('data');
        self.socket.removeAllListeners('close');
        self.socket.removeAllListeners('error');
        self.socket.removeAllListeners('end');
        self.socket.removeAllListeners('timeout');

        self.socket = null;
        self.socket = socket;

        // clear everything from the old socket
        clearTimeout(self.timeout_id);
        self.init_request_data();

        clearTimeout(self.connection_timeout_id);

        self.init();

        if(self.has_sensor == true){
            self.check_slot_availability();
        }
    },
    init: function(){
        var self = this;

        self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg:' - Initializing ' + self.long_name + ' server', color: null}], 0);

        self.socket.on('data', function(data){
            data = data.toString();

            self.recv_msg += data;

            if(data[data.length - 1] == '\n'){
                var message = self.recv_msg;

                message = message.replace(/\n/g, '').replace(/\n/g, '').replace(/^\s+|\s+$/g, '');
                var msg = message.split(" ");

                self.recv_msg = '';
                switch(msg[0]){
                    case '0': // 0 <password (string)>\n - login with password
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Authenticated', color: null}], 0);
                        self.machine_authenticated = true;
                        self.send("1\n", function(sock_stat){});
                        break;
                    case '4': // 4\n - drop ack
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Drop ack', color: null}], 0);

                        if(self.current_request != null){
                            try {
                                self.current_request.run_callback(msg);
                            } catch(e){
                                console.log(self.current_request);
                            }
                        }

                        self.requesting = false;
                        self.current_request = null;

                        self.clear_timeout();

                        break;
                    case '5': // 5/n - drop nack
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Drop nack', color: null}], 0);

                        if(self.current_request != null){
                            self.current_request.run_callback(msg);
                        }

                        self.requesting = false;
                        self.current_request = null;

                        //self.process_queue();
                        self.clear_timeout();
                        break;
                    case '7': // 7\n <slot(int)> <empty(int)>\n || 7 <slot(int)> <empty(int)> <slot(int)> <empty(int)>\n - stat for slot(s)
                        message = message.substr(2, message.length).split(' ` ');
                        for(var i = 0; i < message.length; i++){
                            message[i] = message[i].replace('\n', '').replace('\n', '').split(" ");
                        }

                        if(self.current_request != null){
                            self.current_request.run_callback(message);
                        }

                        self.requesting = false;

                        self.clear_timeout();
                        break;
                    case '8': // 8 <temp(double)>\n - send temp
                        drink_db.log_temp(self.machine_id, msg[1]);
                        break;
                    case '9': // 9\n - noop to keep connection open
                        break;
                }


            } else {
                self.recv_msg += " ";
            }
        });

        self.socket.on('close', function(){
            self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Tini disconnected', color: null}], 0);

            self.connected = false;
        });

        self.socket.on('error', function(){
            self.logger.log_error('Tini error - connection terminated', 'drink_machine');

            self.connected = false;
        });

        self.socket.on('end', function(){
            self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Tini ended', color: null}], 0);

            self.connected = false;
        });

        self.socket.on('timeout', function(){
            self.logger.log_error('Tini error - socket connection timed out (socket.on(timeout)', self.long_name);

            self.connected = false;
        });
    },
    process_queue: function(){
        var self = this;
        // check to see if anything is in the queue
        if(self.request_queue.length > 0){
            self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Processing request queue...', color: null}], 0);

            // pop the top command off the queue
            var request = self.request_queue.pop();

            // set to requesting and set the request callback
            self.requesting = true;
            self.current_request = request;

            // write command to tini
            self.current_request.run_command();
        }
    },
    clear_timeout: function(){
        var self = this;

        clearTimeout(self.timeout_id);

        self.timeout_id = null;

        self.requesting = false;

        self.process_queue();
    },
    prep_command: function(request_obj){
        var self = this;

        if(typeof data == 'undefined'){
            data = {};
        }

        if(self.requesting == false){
            self.logger.log([{msg: self.machine_time(), color: 'grey'}, {msg: '  - Queue is empty, processing command', color: 'grey'}], 0);

            self.requesting = true;
            self.current_request = request_obj;

            request_obj.run_command();
        } else {
            self.logger.log([{msg: self.machine_time(), color: 'grey'}, {msg: ' - System busy, queing command', color: 'grey'}], 0);

            self.request_queue.push(request_obj);
        }
},
    slot_stat: function(slot_num, callback){
        var self = this;

        // TODO stat command is only supposed to be a 6\n, not 6 <slotnum>\n. This either needs to change
        // here or needs to be changed on the tini.

        var response_callback = function(response){
            callback(response);
        }

        var command_exec = function(data){
            //self.socket.write("6 " + slot_num + "\n");
            self.send("6\n", function(sock_stat){
                if(sock_stat == true){
                    self.timeout_id = setTimeout(function(){
                        // send some kind of error code
                        utils.print_error('Tini timeout', 'SLOT_STAT');

                        self.clear_timeout();

                    }, self.TIMEOUT);
                } else {
                    // socket couldnt connect
                    self.current_request.run_callback("6");

                    self.requesting = false;
                    self.current_request = null;

                    //self.process_queue();
                    self.clear_timeout();
                }
            });
        };

        var req = new Request(command_exec, response_callback);

        self.prep_command(req);
    },
    drop: function(slot_num, delay, callback){
        var self = this;

        delay = delay * 1000;
        self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Delaying ' + delay + 'ms', color: null}], 0);

        // run the delay BEFORE queing request
        setTimeout(function(){
            var response_callback = function(response){
                callback(response);
            };

            var command_exec = function(data){

                self.send("3" + data.slot + "\n", function(sock_stat){
                    if(sock_stat == true){
                        self.timeout_id = setTimeout(function(){
                            // tini timed out, log to console, send error code, then continue processing queue
                            utils.print_error('Tini timeout', 'DROP');
                            self.clear_timeout();
                            callback('5');
                        }, self.TIMEOUT);
                    } else {
                        // socket couldnt connect
                        self.current_request.run_callback("6");

                        self.requesting = false;
                        self.current_request = null;

                        //self.process_queue();
                        self.clear_timeout();
                    }

                });
            };

            var req = new Request(command_exec, response_callback, {delay: delay, slot: slot_num});

            self.prep_command(req);

        }, delay);

    },
    check_slot_availability: function(){
        var self = this;
        drink_db.get_machine_id_for_alias(self.machine_id, function(machine_id){
            drink_db.get_stat_for_machine(self.machine_id, function(err, db_slots){
                //console.log(db_slots);
                // get the stats for the slots from the tini
                self.slot_stat(1, function(tini_slots){
                    for(var i = 0; i < tini_slots.length; i++){
                        var tini_data = tini_slots[i];
                        var db_data = db_slots[i];

                        var slot_num = tini_data[0];

                        try {
                            if(tini_data[1] == 1 && db_data.available < 1){
                                // set slot count to 1
                                drink_db.update_slot_count(machine_id, slot_num, 1, function(results){
                                    //console.log("updated " + slot_num + " to 1");
                                });
                            } else if(tini_data[1] == 0 && db_data.available != 0){
                                // set slot count to 0
                                drink_db.update_slot_count(machine_id,  slot_num, 0, function(results){
                                    //console.log("updated " + slot_num + " to 0");
                                });
                            }
                        } catch (e){
                            self.logger.log_error("WTF SHITZ BREAKING OMG!!!!!!!");
                        }
                    }
                });
            });
        });
    },
    send: function(command, cb){
        var self = this;

        if(self.connected == true){
            try {
                self.socket.write(command);
                cb(true);
            } catch(e) {
                // since we cant write, the tini must have disconnected
                self.logger.log_error(self.machine_time() + ' - ERR: could not write to socket (' + self.long_name + ')', self.long_name);
                self.connected = false;
                cb(true);

            }
        } else {
            cb(false);
        }
    }
};

exports.DrinkMachine = DrinkMachine;