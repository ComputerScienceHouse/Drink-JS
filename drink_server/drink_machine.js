var net = require('net');
var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');
var drink_db = require('./mysql.js').DB;

function DrinkMachine(parameters, logger){
    var self = this;

    self.logger = logger;
    
    for(var i in parameters){
        if(!(i in self)){
            self[i] = parameters[i];
        }
    }
    
    self.machine_authenticated = false;
    self.request_callback = null;
    self.request_queue = [];
    self.requesting = false;
    self.timeout_id = null;
    self.TIMEOUT = 10000;

    self.init();

    self.recv_msg = '';

    self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg:' - ' + self.socket.remoteAddress, color: null}], 0);

    if(self.machine.has_sensor == true){
        self.check_slot_availability();
    }

}

DrinkMachine.prototype = {
    init: function(){
        var self = this;
        
        self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg:' - Initializing ' + self.machine.long_name + ' server', color: null}], 0);

        self.socket.on('data', function(data){

            var str_data = data.toString();
            self.recv_msg += str_data;

            if(str_data[str_data.length - 1] == "\n"){
                //console.log(self.recv_msg);
                var raw = self.recv_msg;
                //var message = self.recv_msg.substr(0, self.recv_msg.length - 1).split(" ");
                var message = self.recv_msg;
                var payload = self.recv_msg.substr(0, self.recv_msg.length - 1);
                self.recv_msg = '';
                
                // messages sent from tinis to server
                switch(message[0]){
                    // 0 <password (string)>\n - login with password
                    case "0":
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Authenticated', color: null}], 0);
                        self.machine_authenticated = true;
                        self.socket.write("1\n");
                        break;

                    // 4\n - drop ack
                    case "4":
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Drop ack', color: null}], 0);

                        self.request_callback(raw);
                        self.requesting = false;

                        //self.process_queue();
                        self.clear_timeout();

                        break;

                    // 8 <temp(double)>\n - send temp
                    case "8":
                        drink_db.log_temp(self.machine.machine_id, message[1]);

                        break;

                    // 5\n - drop nack
                    case "5":
                        self.logger.log([{msg: self.machine_time(), color: 'blue'}, {msg: ' - Drop nack', color: null}], 0);

                        self.request_callback(raw);
                        self.requesting = false;

                        //self.process_queue();
                        self.clear_timeout();
                        break;

                    // 7 <slot(int)> <empty(int)>\n || 7 <slot(int)> <empty(int)> <slot(int)> <empty(int)>\n - stat for slot(s)
                    case "7":

                        raw = raw.substr(1, raw.length).split('`');
                        for(var i = 0; i < raw.length; i++){
                            raw[i] = raw[i].replace('\n', '').replace('\n', '').split(" ");
                        }
                        
                        if(self.request_callback){
                            self.request_callback(raw);
                        }

                        self.requesting = false;

                        //self.process_queue();
                        self.clear_timeout();
                        break;

                    // 9\n - noop to keep connection open
                    case "9":
                        break;
                }
            } else {
                self.recv += " ";
            }
        });

        self.socket.on('close', function(){
            self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Tini disconnected', color: null}], 0);
            
            self.machine.connected = false;
        });

        self.socket.on('error', function(){
            self.logger.log_error('Tini error - connection terminated', 'drink_machine');

            self.machine.connected = false;
        });

        self.socket.on('end', function(){
            self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Tini ended', color: null}], 0);

            self.machine.connected = false;
        });

        self.socket.on('timeout', function(){
            self.logger.log_error('Tini error - connection timed out', 'drink_machine');

            self.machine.connected = false;
        });

    },
    machine_time: function(){
        var self = this;
        return util.get_time() + ' (' + self.machine.long_name + ')';
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
    prep_command: function(command_exec, response_callback, data){
        var self = this;

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


    },
    /**
     * Get the status for all slots
     *
     * @param callback
     */
    SLOT_STAT: function(slot_num, callback){
        var self = this;

        // TODO stat command is conly supposed to be a 6\n, not 6 <slotnum>\n. This either needs to change
        // here or needs to be changed on the tini.

        var response_callback = function(response){
            callback(response);
        }

        var command_exec = function(data){
            //self.socket.write("6 " + slot_num + "\n");
            self.socket.write("6\n");
            self.timeout_id = setTimeout(function(){
                // send some kind of error code
                util.print_error('Tini timeout', 'SLOT_STAT');

                self.clear_timeout();

            }, self.TIMEOUT);
        }

        self.prep_command(command_exec, response_callback);

    },
    /**
     * Drop a drink. 
     * @param slot
     * @param delay
     */
    DROP: function(slot, delay, callback){
        var self = this;

        var response_callback = function(response){
            callback(response);

        }

        var command_exec = function(data){
            data.delay = data.delay * 1000;
            self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Delaying ' + data.delay + 'ms', color: null}], 0);
            
            setTimeout(function(){
                self.socket.write("3" + data.slot + "\n");
                self.timeout_id = setTimeout(function(){
                    // tini timed out, log to console, send error code, then continue processing queue
                    util.print_error('Tini timeout', 'DROP');
                    self.clear_timeout();
                    callback('5');
                }, self.TIMEOUT);

            }, data.delay);
        }

        self.prep_command(command_exec, response_callback, {delay: delay, slot: slot});
    },
    check_slot_availability: function(){
        var self = this;
        drink_db.get_machine_id_for_alias(self.machine.machine_id, function(machine_id){
            drink_db.get_stat_for_machine(self.machine.machine_id, function(err, db_slots){
                // get the stats for the slots from the tini
                self.SLOT_STAT(1, function(tini_slots){

                    for(var i = 0; i < tini_slots.length; i++){
                        var tini_data = tini_slots[i];
                        var db_data = db_slots[i];

                        var slot_num = tini_data[0];

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
                    }
                });
            });
        });
    }
};

exports.server = DrinkMachine;
