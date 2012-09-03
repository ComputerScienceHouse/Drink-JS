var SundayServer = require('./SundayServer.js').SundayServer,
    MachineServer = require('./MachineServer.js').MachineServer,
    utils = require('./utils.js').utils,
    config = utils.get_config(),
    colors = require('colors'),
    logger = require('./logger.js').logger,
    net = require('net'),
    tls = require('tls');

logger.log([{msg: utils.get_time(), color: 'green'}, {msg: ' - Drink server starting...', color: null}], 0);

// 1). Create an instance of the SundayServer for each type of connection (SSL/Non-SSL)

// standard TCP, no ssl. 4242
var sunday_serv = net.Server();
var sunday = new SundayServer(sunday_serv, logger, config, config.sunday);

// SSL connection. 4243
//var sunday_serv_ssl = tls.Server();
//var sunday_ssl = new SundayServer(sunday_serv_ssl, logger, config);

// 2). Create one instance of the machine server
var machine_server = new MachineServer(sunday, config, logger);

sunday.set_machine_server(machine_server);

// 3). Init the machine server
machine_server.init();

// 4). init the sunday server
sunday.init();
