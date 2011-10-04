/**
 * Created by JetBrains PhpStorm.
 * User: seanmcgary
 * Date: 9/26/11
 * Time: 3:15 AM
 * To change this template use File | Settings | File Templates.
 */
var express = require('express');

var app = express.createServer();

app.get('/', function(req, res){
    res.redirect('https://members.csh.rit.edu/drink');
});

app.listen(80);