var SundayServer = require('./SundayServer.js');
var MachineServer = require('./MachineServer.js');

var util = require('./util.js').util;
var config = util.get_config();
var colors = require('colors');
var sys = require('sys');
var logger = require('./logger.js').logger;

var machines = {};

logger.log([{msg: util.get_time(), color: 'green'}, {msg: ' - Drink server starting...', color: null}], 0);

// 1). Create one instance of the machine server

// 2). Create an instance of the SundayServer for each type of connection (SSL/Non-SSL)

var sunday_serv = net.createServer();

var sunday = new SundayServer(sunday_serv, );