
var net = require('net');
var colors = require('colors');
var util = require('../drink_server/util.js').util;
var sys = require('sys');
var readline = require('readline');

var socket = new net.Socket();
socket.connect(4242, 'drink-dev.csh.rit.edu');

var connected = false;
var first_data = true;

socket.on('connect', function(data){
    connected = true;
    console.log("Welcome to Drink!!");
    rl.setPrompt(prefix, prefix.length);
    rl.prompt();
});

socket.on('data', function(data){
    data = data.toString();

});

var rl = readline.createInterface(process.stdin, process.stdout);

var prefix = "> ";


function print_help(){
    console.log("\tlogin <username> <password>  Log into drink");
    console.log("\tmachine <ld | d | s>         Select a machine");
    console.log("\tdrop <slotnum> <delay>       Drop a drink with a delay");
    console.log("\tstat                         Get the stats on the machine");
    console.log("\tgetbalance                   Get yor drink balance");
}

rl.on('line', function(data){
    if(data == 'help'){
        print_help();
    }

    rl.prompt();
});






