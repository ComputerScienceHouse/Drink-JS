var sunday = require('./sunday_server.js');
var machine_server = require('./machine_server.js');
var util = require('./util.js').util;
var config = util.get_config();
var colors = require('colors');
var sys = require('sys');
var logger = require('./logger.js').logger;

var machines = {};

logger.log_2([{msg: util.get_time(), color: 'green'}, {msg: ' - Drink server starting...', color: null}], 0);

var machine_serv = new machine_server.server(config, sunday_serv, logger);
machine_serv.init();

var sunday_serv = new sunday.server(config, logger);
//sunday_serv.set_machines(machines);
sunday_serv.set_machine_server(machine_serv);

sunday_serv.init();





