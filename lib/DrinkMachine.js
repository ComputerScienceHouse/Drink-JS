/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/22/11
 * Time: 12:11 AM
 * To change this template use File | Settings | File Templates.
 */
var net = require('net'),
    colors = require('colors'),
    sys = require('sys'),
    drink_db = require('./MySQLHandler.js').MySQLHandler,
    utils = require('./utils.js').utils;


function DrinkMachine(conn, logger){
    var self = this;

    self.logger = logger;

    self.machine_id = conn.machine.machine_id;
    self.long_name = conn.machine.long_name;
    self.connected = conn.machine.connected;
    self.socket = conn.socket;
    self.has_sensor = conn.machine.has_sensor;
    self.machine_authenticated = conn.authenticated;


    self.request_callback = null;
    self.request_queue = [];
    self.requesting = false;
    self.timeout_id = null;
    self.TIMEOUT = 10000;

    self.connection_timeout_id = null;

    self.init();

    self.recv_msg = '';

    self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg:' - ' + self.socket.remoteAddress, color: null}], 0);

    if(self.has_sensor == true){
        self.check_slot_availability();
    }

    // set some timeouts

}

DrinkMachine.prototype = {
    machine_time: function(){
        var self = this;
        return utils.get_time() + ' (' + self.long_name + ')';
    },
    set_connection_timeout: function(){
        var self = this;
        self.connection_timeout_id = setTimeout(function(){
            self.logger.log_error('Tini error - connection timed out', 'drink_machine');
            self.connected = false;
        }, 90000);
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
        self.request_callback = null;
        self.request_queue = [];
        self.requesting = false;
        self.timeout_id = null;

        self.init();
    },
    init: function(){
        var self = this;

        self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg:' - Initializing ' + self.long_name + ' server', color: null}], 0);

        self.socket.on('data', function(data){
            data = data.toString();

            self.recv_msg += data;

            if(data[data.length - 1] == '\n'){
                var message = self.recv_msg;

                var payload = self.recv_msg.substr(0, self.recv_msg.length.length - 1);
                message = message.replace(/\n/g, '').replace(/\n/g, '').replace(/^\s+|\s+$/g, '');
                var msg = message.split(" ");

                self.recv_msg = '';
                switch(msg[0]){
                    case '0': // 0 <password (string)>\n - login with password
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Authenticated', color: null}], 0);
                        self.machine_authenticated = true;
                        //self.socket.write("1\n");
                        self.send("1\n");
                        // now that the machine is connected, set a timeout for connection
                        self.set_connection_timeout();
                        break;
                    case '4': // 4\n - drop ack
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Drop ack', color: null}], 0);

                        self.request_callback(msg);
                        self.requesting = false;

                        self.request_callback = null;

                        //self.process_queue();
                        self.clear_timeout();
                        break;
                    case '5': // 5/n - drop nack
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Drop nack', color: null}], 0);

                        self.request_callback(msg);
                        self.requesting = false;

                        //self.process_queue();
                        self.clear_timeout();
                        break;
                    case '7': // 7\n <slot(int)> <empty(int)>\n || 7 <slot(int)> <empty(int)> <slot(int)> <empty(int)>\n - stat for slot(s)
                        message = message.substr(2, message.length).split(' ` ');
                        for(var i = 0; i < message.length; i++){
                            message[i] = message[i].replace('\n', '').replace('\n', '').split(" ");
                        }

                        if(self.request_callback){
                            self.request_callback(message);
                        }

                        self.requesting = false;

                        //self.process_queue();
                        self.clear_timeout();
                        break;
                    case '8': // 8 <temp(double)>\n - send temp
                        //self.logger.log([{msg: self.machine_time(), color: 'yellow'}, {msg:' - TEMP ' + self.long_name + ' server', color: 'yellow'}], 0);
                        drink_db.log_temp(self.machine_id, msg[1]);

                        // drink and little drink
                        if(self.has_sensor == true){
                            self.reset_connection_timeout();
                        }

                        break;
                    case '9': // 9\n - noop to keep connection open
                        //self.logger.log([{msg: self.machine_time(), color: 'yellow'}, {msg:' - NOOP ' + self.long_name + ' server', color: 'yellow'}], 0);

                        // snack
                        if(self.has_sensor != true){
                            self.reset_connection_timeout();
                        }
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
            self.logger.log_error('Tini error - connection timed out', 'drink_machine');

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
            self.request_callback = request.callback;

            // write command to tini
            request.command(request.data);
            //self.socket.write(request.command);
        }
    },
    clear_timeout: function(){
        var self = this;

        clearTimeout(self.timeout_id);

        self.timeout_id = null;

        // send timeout to client here?

        self.requesting = false;

        self.process_queue();
    },
    reset_connection_timeout: function(){
        var self = this;

        clearTimeout(self.connection_timeout_id);

        self.set_connection_timeout();

    },
    prep_command: function(command_exec, response_callback, data){
        var self = this;

        if(self.connected == true){
            if(typeof data == 'undefined'){
                data = {};
            }

            if(self.requesting == false){
                self.logger.log([{msg: self.machine_time(), color: 'grey'}, {msg: '  - Queue is empty, processing command', color: 'grey'}], 0);

                self.requesting = true;
                self.request_callback = response_callback;

                command_exec(data);
            } else {
                self.logger.log([{msg: self.machine_time(), color: 'grey'}, {msg: ' - System busy, queing command', color: 'grey'}], 0);

                self.request_queue.push({command: command_exec, data: data, callback: response_callback});
            }
        } else {
            response_callback('5');
        }
    },
    slot_stat: function(slot_num, callback){
        var self = this;

        // TODO stat command is conly supposed to be a 6\n, not 6 <slotnum>\n. This either needs to change
        // here or needs to be changed on the tini.

        var response_callback = function(response){
            callback(response);
        }

        var command_exec = function(data){
            //self.socket.write("6 " + slot_num + "\n");
            self.send("6\n");
            self.timeout_id = setTimeout(function(){
                // send some kind of error code
                utils.print_error('Tini timeout', 'SLOT_STAT');

                self.clear_timeout();

            }, self.TIMEOUT);
        }

        self.prep_command(command_exec, response_callback);
    },
    drop: function(slot_num, delay, callback){
        var self = this;

        var response_callback = function(response){
            callback(response);

        }

        var command_exec = function(data){
            data.delay = data.delay * 1000;
            self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Delaying ' + data.delay + 'ms', color: null}], 0);

            setTimeout(function(){
                self.send("3" + data.slot + "\n");
                self.timeout_id = setTimeout(function(){
                    // tini timed out, log to console, send error code, then continue processing queue
                    utils.print_error('Tini timeout', 'DROP');
                    self.clear_timeout();
                    callback('5');
                }, self.TIMEOUT);

            }, data.delay);
        }

        self.prep_command(command_exec, response_callback, {delay: delay, slot: slot_num});
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
    send: function(command){
        var self = this;

        if(self.connected == true){
            try {
                self.socket.write(command);
                return true;
            } catch(e) {
                // since we cant write, the tini must have disconnected
                self.connected = false;
                return false;
            }
        } else {
            return false;
        }
    }
};

exports.DrinkMachine = DrinkMachine;