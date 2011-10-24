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
    log_2: function(message, level){
        var self = this;
        
        var stdout_string = '';
        var log_string = '';

        for(var i in message){
            if(message[i].color == null){
                message[i].color = 'white';
            }


            var str = message[i].msg;

            stdout_string += str[message[i].color];
            log_string += str;

            //console.log(stdout_string);
        }

        //console.log(stdout_string);

        if(self.stdout == true){
            // print to stdout
            sys.puts(stdout_string);

        }

        if(self.db == true){
            self.mongodb.logs.save({time_logged: util.get_unix_time(), message: log_string, log_leve: level}, function(err, post){

            });
        }

        if(self.file == true){

        }
    },
    /**
     *
     * @param message   - The message (object) to log
     *                  [{
     *                      msg: <message (string)>,
     *                      color: <color (string)>,
     *                   },{}]
     *
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