
var net = require('net');
var colors = require('colors');
var util = require('./util.js').util;
var sys = require('sys');

var socket = net.connect(4242, 'drink-dev.csh.rit.edu')