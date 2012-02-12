/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 9/26/11
 * Time: 3:15 AM
 * To change this template use File | Settings | File Templates.
 */
var express = require('express');
var fs = require('fs');

var drinkapp = express.createServer();
drinkapp.get('/', function(req, res){
    res.redirect('https://members.csh.rit.edu/drink');
});

var wsapp = express.createServer();

wsapp.get('*', function(req, res){
    res.redirect('https://drink.csh.rit.edu:8080');
});


// Create a webserver as a proxy
var app = express.createServer();

app.configure(function(){
    app.use(express.vhost('drink.csh.rit.edu', drinkapp));
    app.use(express.vhost('ws.drinkjs.csh.rit.edu', wsapp));
});
app.listen(80);


var app_ssl = express.createServer({
    key: fs.readFileSync('/etc/ssl/drink/key.pem'),
    cert: fs.readFileSync('/etc/ssl/drink/cert.pem'),
    ca: fs.readFileSync('/etc/ssl/certs/CA-Certificate.crt')
});
app_ssl.configure(function(){
    app.use(express.vhost('drink.csh.rit.edu', drinkapp));
    app.use(express.vhost('ws.drink.csh.rit.edu', wsapp));
});
app_ssl.listen(443);


/*drinkapp.get('/', function(req, res){
    res.redirect('https://members.csh.rit.edu/drink');
});

// create the SSL enabled connection
var app_ssl = express.createServer({
    key: fs.readFileSync('/etc/ssl/drink/key.pem'),
    cert: fs.readFileSync('/etc/ssl/drink/cert.pem'),
    ca: fs.readFileSync('/etc/ssl/certs/CA-Certificate.crt')
});

app_ssl.get('/', function(req, res){
    res.redirect('https://members.csh.rit.edu/drink');
});

app.listen(80);
app_ssl.listen(443);*/