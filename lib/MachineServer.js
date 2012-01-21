/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:18 PM
 * To change this template use File | Settings | File Templates.
 */
var net = require('net'),
    utils = require('./utils.js').utils,
    DrinkMachine = require('./DrinkMachine.js').DrinkMachine;

function MachineServer(sunday_server, config, logger){
    var self = this;

    self.sunday_server = sunday_server;
    self.logger = logger;

    self.machines = config.machines;
    self.machine_config = config.machine_server;
    self.tini_ips = config.tini_ips;

    self.server = null;

}

MachineServer.prototype = {
    init: function(){
        var self = this;

        // create the server
        self.server = net.createServer(function(socket){

            //var conn = this;
            var conn = {
                machine: null,
                authenticated: false
            };

            socket.on('connect', function(){
                self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Tini connecting from ' + socket.remoteAddress, color: null}], 0);

                // if the requesting IP is that of a valid tini..
                if(socket.remoteAddress in self.tini_ips){
                    // get the alias from the config
                    var machine_alias = self.tini_ips[socket.remoteAddress];

                    // check to make sure the machine isnt already connected
                    if(self.machine_connected(machine_alias) == false){
                        self.set_machine_connection_status(machine_alias, true);

                        conn.machine = self.machines[machine_alias];
                        conn.socket = socket;

                        self.create_machine_instance(machine_alias, conn);
                    }
                } else {
                    // else deny it
                    self.logger.log([{msg: self.machine_time(), color: 'gray'}, {msg: ' - Invalid IP address for tini', color: 'gray'}], 0);
                    socket.write("2\n");
                    socket.destroy();
                }
            });
        });

        self.server.listen(self.machine_config.port, self.machine_config.host);
        self.logger.log([{msg: self.machine_time(), color: 'cyan'}, {msg: ' - Initializing machine server ' + self.machine_config.host + ':' + self.machine_config.port, color: null}], 0);
    },
    machine_connected: function(machine_alias){
        var self = this;

        if(machine_alias in self.machines && self.machines[machine_alias].connected == true){
            return true;
        } else {
            return false;
        }

    },
    set_machine_connection_status: function(machine_alias, status){
        var self = this;

        if(machine_alias in self.machines){
            self.machines[machine_alias].connected = status;
        }
    },
    create_machine_instance: function(machine_alias, conn){
        var self = this;

        if(machine_alias in self.machines){
            self.machines[machine_alias].machine_inst = new DrinkMachine(conn, self.logger);
        }
    },
    machine_time: function(){
        var self = this;
        return utils.get_time() + ' (machine_server)';
    },
    get_name_for_machine: function(machine_alias){
        var self = this;

        if(machine_alias in self.machines){
            return self.machines[machine_alias].long_name;
        }
    },
    is_valid_machine: function(machine_alias){
        var self = this;

        if(machine_alias in self.machines){
            return true;
        } else {
            return false;
        }
    }
};

exports.MachineServer = MachineServer;