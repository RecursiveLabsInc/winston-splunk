// winston-splunk.js: Transport for outputting logs over UDP to splunk
var util = require('util'),
    winston = require('winston'),
    dgram = require('dgram');

var splunk = exports.splunk = winston.transports.splunk = function (options) {
    this.name = 'splunk';
    this.level = options.level || 'info';
    this.silent     = options.silent     || false;
    this.handleExceptions = options.handleExceptions || false;
    this.udpClient = dgram.createSocket('udp4');
    this.udpClient.on('error', function (err) {
        // Handle any surprise errors
        util.error(err);
    });

    this.splunkHost = options.splunkHost || 'localhost';
    this.splunkPort = options.splunkPort || 54321;
    this.splunkHostname = options.splunkHostname || require('os').hostname();
    this.splunkSource = options.splunkSource || 'nodejs';
};

util.inherits(splunk, winston.Transport);

var getMessageLevel = function (winstonLevel) {
    switch (winstonLevel) {
        case 'silly':
        case 'debug': return 7;
        case 'verbose':
        case 'data':
        case 'prompt':
        case 'input':
        case 'info': return 6;
        case 'help':
        case 'notice': return 5;
        case 'warn':
        case 'warning': return 4;
        case 'error': return 3;
        case 'crit': return 2;
        case 'alert': return 1;
        case 'emerg': return 0;
        default: return 6
    }
};

splunk.prototype.log = function (level, msg, meta, callback) {
    var self = this, message = {};

    if (self.silent) {
        return callback(null, true);
    }

    message._timestamp = +new Date();
    message.host = self.splunkHostname;
    message.message = msg;
    message.meta = meta || {};
    message.level = level;
    message.env = process.env.NODE_ENV;
    message.source = self.splunkSource;

    var jsonMessage = new Buffer(JSON.stringify(message));

    this.udpClient.send(jsonMessage, 0, jsonMessage.length, self.splunkPort, self.splunkHost, function (err, bytes) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, true);
        }
    });
};
