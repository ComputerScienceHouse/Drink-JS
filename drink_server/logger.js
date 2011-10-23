var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');
var mongo = require('mongodb-wrapper');

function Logger(){
    var self = this;

    var config = util.get_config().logging;

    self.stdout = config.stdout;
    self.db = config.db;
    self.file = config.file;

    if('db_data' in config){
        self.db_config = config.db_data;
        console.log(self.db_config);
        self.mongodb = mongo.db(self.db_config.host, self.db_config.port, self.db_config.db);
        self.mongodb.collection('logs');
    } else {
        self.db_config = null;
    }
};

Logger.prototype = {
    set_stdout: function(val){
        var self = this;

        self.stdout = val;
    },
    set_db: function(val){
        var self = this;

        self.db = val;
    },
    set_file: function(val){
        var self = this;

        self.file = val;
    },
    /**
     *
     * @param message   - The message to log (with or without color)
     * @param level     - Levels of log messages
     *                      - 0 Normal
     *                      - 1 Warn
     *                      - 3 Error
     */
    log: function(message, level){
        var self = this;

        if(self.stdout == true){
            // print to stdout
            sys.puts(message);

        }

        if(self.db == true){
            self.mongodb.logs.save({time_logged: util.get_unix_time(), message: message, log_leve: level}, function(err, post){

            });
        }

        if(self.file == true){

        }
    }
}

exports.logger = new Logger();