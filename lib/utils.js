/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 9/4/11
 * Time: 6:35 PM
 * To change this template use File | Settings | File Templates.
 */
var colors = require('colors'),
    util = require('util');

exports.utils = {
    get_time: function() {
	    return new Date().toUTCString();
    },
    get_unix_time: function(){
        return parseInt(new Date().getTime() / 1000);
    },
    print_error: function(error_msg, location){
        var self = this;
        util.puts((self.get_time() + ' (' + location + ')').red + ' - ' + (error_msg).grey);
    },
    get_config: function(){
        var self = this;
        
        if(typeof process.env.DRINK_ENV != 'undefined'){
            if(process.env.DRINK_ENV == 'dev'){
                util.puts((self.get_time() + ' - ').magenta + 'Running in dev mode');
                return require('../configs/drink_config_dev.js').config;
            } else {
                return require('../configs/drink_config.js').config;
            }
        } else {
            return require('../configs/drink_config.js').config;
        }
    }
}