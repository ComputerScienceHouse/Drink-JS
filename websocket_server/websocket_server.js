/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 9/26/11
 * Time: 1:27 AM
 * To change this template use File | Settings | File Templates.
 */
var io = require('socket.io');
var express = require('express');
var net = require('net');
var fs = require('fs');

var ssl = {
  key: fs.readFileSync('/etc/ssl/drink/key.pem'),
  cert: fs.readFileSync('/etc/ssl/drink/cert.pem'),
  ca: fs.readFileSync('/etc/ssl/certs/CA-Certificate.crt')
};

var app = express.createServer(ssl);

io = io.listen(app);

io.sockets.on('connection', function(socket){

    var conn = {};

    var request_queue = [];
    var requesting = false;
    var request_callback = null;
    
    // connect to the sunday server
    conn.drink_conn = new net.Socket();
    conn.drink_conn.connect(4242, 'drinkjs.csh.rit.edu', function(){
        
    });

    conn.drink_conn.on('data', function(data){
        var data = data.toString();

        if(request_callback != null){
            request_callback(data);
            requesting = false;

            process_queue();
        }

    });

    function process_queue(){
        if(request_queue.length > 0){
            var request = request_queue.pop();
            requesting = true;
            request_callback = request.callback;

            request.command();
        }
    }

    function command_prep(callback, command){
        if(requesting == false){
            request_callback = callback;
            command();
        } else {
            request_queue.push({command: command, callback: callback});
        }
    }

    socket.on('ibutton', function(data){
        var ibutton = data.ibutton;

        var callback = function(drink_data){
            socket.emit('ibutton_recv', drink_data);
        }

        var command = function(){
            conn.drink_conn.write("IBUTTON " + ibutton + "\n");
        }

        command_prep(callback, command);

    });

    socket.on('machine', function(data){
        console.log("MACHINE");
        console.log(data);
        var callback = function(recv_data){
            socket.emit('machine_recv', recv_data);
        }

        var command = function(){
            console.log("Machine id = " + data.machine_id);
            conn.drink_conn.write("MACHINE " + data.machine_id + "\n");
        }

        command_prep(callback, command);
    });

    socket.on('drop', function(data){
        console.log("DROPPING");
        var callback = function(recv_data){
            socket.emit('drop_recv', recv_data);
        }

        var command = function(){
            conn.drink_conn.write("DROP " + data.slot_num + " " + data.delay + "\n");
        }

        command_prep(callback, command);
    });

    socket.on('stat', function(){
        console.log('sending stat');

        var callback = function(drink_data){
            socket.emit('stat_recv', drink_data);
        }

        var command = function(){
            conn.drink_conn.write("STAT\n");
        }

        command_prep(callback, command);


    });



});

app.listen(8080);