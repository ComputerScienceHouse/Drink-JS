/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 12/21/11
 * Time: 11:18 PM
 * To change this template use File | Settings | File Templates.
 */

function MachineServer(sunday_server, logger, config){
    var self = this;

    self.sunday_server = sunday_server;
    self.logger = logger;


}

MachineServer.prototype = {
    init: function(){
        var self = this;
    }
};

exports.MachineServer = MachineServer;