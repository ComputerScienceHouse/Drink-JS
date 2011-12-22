/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 9/26/11
 * Time: 3:15 AM
 * To change this template use File | Settings | File Templates.
 */
var express = require('express');
var fs = require('fs');

// create the standard non-ssl connection
var app = express.createServer();

app.get('/', function(req, res){
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
app_ssl.listen(443);