var net = require('net');
var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');
var drink_db = require('./mysql.js').DB;

function DrinkMachine(parameters){
    var self = this;
    
    for(var i in parameters){
        if(!(i in self)){
            self[i] = parameters[i];
        }
    }

    self.machine_authenticated = false;
    self.request_callback = null;
    self.request_queue = [];
    self.requesting = false;

    self.init();

    self.recv_msg = '';

    sys.puts(self.machine_time().cyan + ' - ' + self.socket.remoteAddress);
}

DrinkMachine.prototype = {
    init: function(){
        var self = this;
        
        sys.puts(self.machine_time().cyan + ' - Initializing ' + self.machine.long_name + ' server');

        self.socket.on('data', function(data){

            var str_data = data.toString();
            self.recv_msg += str_data;

            if(str_data[str_data.length - 1] == "\n"){
                var raw = self.recv_msg;
                var message = self.recv_msg.substr(0, self.recv_msg.length - 1).split(" ");
                self.recv_msg = '';
                
                // messages sent from tinis to server
                switch(message[0]){
                    // 0 <password (string)>\n - login with password
                    case "0":
                        sys.puts(self.machine_time().blue + ' - Authenticated');
                        self.machine_authenticated = true;
                        self.socket.write("1\n");
                        break;

                    // 4\n - drop ack
                    case "4":

                        sys.puts(self.machine_time().blue + ' - Drop ack');

                        self.request_callback(raw);
                        self.requesting = false;

                        self.process_queue();

                        break;

                    // 8 <temp(double)>\n - send temp
                    case "8":
                        //sys.puts(self.machine_time().blue + ' - Temp:' + message[1]);

                        drink_db.log_temp(self.machine.machine_id, message[1]);

                        break;

                    // 5\n - drop nack
                    case "5":
                        sys.puts(self.machine_time().blue + ' - Drop nack');

                        self.request_callback(raw);
                        self.requesting = false;

                        self.process_queue();
                        break;

                    // 7 <slot(int)> <empty(int)>\n || 7 <slot(int)> <empty(int)> <slot(int)> <empty(int)>\n - stat for slot(s)
                    case "7":
                        //sys.puts(self.machine_time().blue + ' - slot statuses');
                        raw = raw.substr(1, raw.length).split('`');
                        for(var i = 0; i < raw.length; i++){
                            raw[i] = raw[i].replace('\n', '').replace('\n', '');
                        }

                        if(self.request_callback){
                            self.request_callback(raw);
                        }

                        self.requesting = false;

                        self.process_queue();

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
            sys.puts(self.machine_time().cyan + ' - Tini disconnected');
            
            self.machine.connected = false;
        });

        self.socket.on('error', function(){
            util.print_error('Tini error - connection terminated', 'drink_machine');

            self.machine.connected = false;
        });

        self.socket.on('end', function(){
            sys.puts(self.machine_time().cyan + ' - Tini ended');

            self.machine.connected = false;
        });

        self.socket.on('timeout', function(){
            util.print_error('Tini error - connection timed out', 'drink_machine');

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
            sys.puts(self.machine_time().cyan + ' - Processing request queue...');

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
    /**
     * Get the status for all slots
     *
     * @param callback
     */
    SLOT_STAT: function(slot_num, callback){
        var self = this;

        var response_callback = function(response){
            callback(response);
        }

        var command_exec = function(data){
            self.socket.write("6 " + slot_num + "\n");
        }

        if(self.requesting == false){
            self.requesting = true;
            self.request_callback = response_callback;

            command_exec();
        } else {

            self.request_queue.push({command: command_exec, data: {}, callback: response_callback});
        }


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
            sys.puts(self.machine_time().cyan + ' - Delaying ' + data.delay + 'ms');
            setTimeout(function(){
                self.socket.write("3" + data.slot + "\n");
            }, data.delay);
        }

        if(self.requesting == false){
            self.requesting = true;
            self.request_callback = response_callback;

            command_exec({slot: slot, delay: delay});

        } else {

            self.request_queue.push({command: command_exec, data: {slot: slot, delay: delay}, callback: response_callback});
        }
    }
};

exports.server = DrinkMachine;
