var sunday = require('./sunday_server.js');
var machine_server = require('./machine_server.js');
var util = require('./util.js').util;
var config = util.get_config();
var colors = require('colors');
var sys = require('sys');

var machines = {};

sys.puts(util.get_time().green + ' - Drink server starting...');

var machine_serv = new machine_server.server(config, sunday_serv);
machine_serv.init();

var sunday_serv = new sunday.server(config);
//sunday_serv.set_machines(machines);
sunday_serv.set_machine_server(machine_serv);

sunday_serv.init();





