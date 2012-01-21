/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:31 PM
 * To change this template use File | Settings | File Templates.
 */

var colors = require('colors'),
    utils = require('./utils.js').utils,
    util = require('util'),
    mysql = require('mysql'),
    config = require('../configs/mysql_config.js').mysql;

function MySQLHandler(){
    var self = this;

    self.database = 'drink_v2';
    self.client = null;


    self.init();
}

MySQLHandler.prototype = {
    init: function(){
        var self = this;
        util.puts(self.db_time().yellow + ' - Connecting to drink db');

        self.client = mysql.createClient({
            user: config.user,
            password: config.password,
            host: config.host
        });

        self.client.query('USE drink_v2');
    },
    db_time: function(){
        var self = this;
        return utils.get_time() + ' (drink_db)';
    },
    close: function(){
        var self = this;

        self.client.end();
    },
    get_machine_id_for_alias: function(alias, callback){
        var self = this;
        var sql = "SELECT machine_id FROM machine_aliases WHERE alias='" + alias + "'";

        self.client.query(sql, function(err, results, fields){
            if(err == null){
                if(results.length > 0){
                    callback(results[0].machine_id);
                } else {
                    callback(null);
                }

            } else {
                // do something with the sql error
                callback(null);
            }
        });
    },
    get_status_for_slot: function(machine_alias, slot_num, callback){
        var self = this;
        self.get_machine_id_for_alias(machine_alias, function(machine_id){
            if(machine_id != null){
                var sql = "SELECT * FROM slots LEFT JOIN drink_items USING(item_id) WHERE machine_id=" + machine_id + " AND slot_num=" + slot_num;
                self.client.query(sql, function(err, results, fields){
                    if(err == null){
                        if(results.length > 0){
                            callback(results[0]);
                        } else {
                            callback(false);
                        }
                    } else {
                        // do something with sql error
                        util.print_error("Slot not found", "get_status_for_slot - " + sql);
                        callback(null);
                    }
                });
            } else {
                callback(null);
                util.print_error("Could not get machine id for alias", "get_status_for_slot");
            }
        });
    },
    update_slot_count: function(machine_id, slot_num, count, callback){
        var self = this;
        var sql = "UPDATE slots SET available=" + count + " WHERE slot_num=" + slot_num + " AND machine_id=" + machine_id;
        self.client.query(sql, function(err, results, fields){
            if(err == null){
                callback(results);
            } else {
                callback(null);
            }
        });
    },
    log_drop: function(machine_id, uid, slot_num, item_id, drink_price, status, callback){
        var self = this;
        var money_sql = "INSERT INTO money_log(username, admin, amount, direction, reason) " +
                                "VALUES('" + uid + "', 'drink', " + (drink_price * -1) + ", 'out', 'drop')";

        self.client.query(money_sql);

        var sql = "INSERT INTO drop_log(machine_id, slot, username, status, item_id, current_item_price) " +
            "VALUES(" + machine_id + ", " + slot_num + ", '" + uid + "', '" + status + "', " + item_id + ", " + drink_price + ")";

        self.client.query(sql,
            function(err, results, fields){
                if(err == null){
                    // decrement from slot
                    var update_sql = "UPDATE slots SET available = available - 1 " +
                        "WHERE machine_id=" + machine_id + " AND slot_num=" + slot_num;

                    self.client.query(update_sql,
                        function(err, results, fields){
                            if(err == null){
                                callback(true);
                            } else {
                                callback(false);
                            }
                        }
                    );
                } else {
                    callback(false);
                }
            }
        );
    },
    log_temp: function(machine_alias, temp){
        var self = this;
        self.get_machine_id_for_alias(machine_alias, function(machine_id){
            if(machine_id != null){
                var temp_sql = "INSERT INTO temperature_log(machine_id, temp) VALUES(" + machine_id + ", " + temp + ")";
                self.client.query(temp_sql);
            }
        });
    },
    get_stat_for_machine: function(machine_alias, callback){
        var self = this;

        self.get_machine_id_for_alias(machine_alias, function(machine_id){
            if(machine_id != null){
                var machine_sql = "SELECT * FROM slots LEFT JOIN drink_items USING(item_id) WHERE machine_id=" + machine_id + " ORDER BY slot_num ASC";
                self.client.query(machine_sql, function(err, results, fields){
                    callback(err, results);
                });
            } else {
                callback(false);
            }
        });
    }
};

exports.MySQLHandler = new MySQLHandler();