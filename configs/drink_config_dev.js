/**
 * Config file for development purposes
 */
var fs = require('fs');

exports.config = {
    machine_server: {
        host: '0.0.0.0',
        port: 4343
    },
    tini_ips: {
        '127.0.0.1': 'd',
        '127.0.1.1': 'd',
        '129.21.50.201': 's',
        '129.21.60.128': 'd',
        '129.21.63.50': 'ld',
        '129.21.62.51': 's',
        '129.21.61.98': 's',
        '129.21.66.135': 'ld'
    },
    machine_ip_mapping: {
        '127.0.0.1': 'd',
        '127.0.1.1': 'd',
        '129.21.50.201': 's',
        '129.21.60.128': 'd',
        '129.21.63.50': 'ld',
        '129.21.62.51': 's',
        '129.21.61.98': 's',
        '129.21.66.135': 'ld'
    },
    machines: {
        ld: {
            machine_id: 'ld',
            long_name: 'Little Drink',
            connected: false,
            socket: null
        },
        d: {
            machine_id: 'd',
            long_name: 'Big Drink',
            connected: false,
            socket: null
        },
        s: {
            machine_id: 's',
            long_name: 'Snack',
            connected: false,
            socket: null
        }
    },
    sunday: {
        host: '0.0.0.0',
        port: 4242
    },
    sunday_ssl: {
        host: '0.0.0.0',
        port: 4243,
        ssl: {
            key: fs.readFileSync('/etc/ssl/drink/key.pem'),
            cert: fs.readFileSync('/etc/ssl/drink/cert.pem'),
            ca: fs.readFileSync('/etc/ssl/certs/CA-Certificate.crt')
        }
    },
    sunday_opcodes: [
        'UPTIME',
        'WHOAMI',
        'GETBALANCE',
        'QUIT',
        'MACHINE',
        'DROP',
        'USER',
        'PASS',
        'IBUTTON',
        'STAT',
        'SERVERSTAT'
    ],
    error_codes: require('./drink_response_codes.js').codes,
    machine_codes: {
        "ld": "Little Drink",
        "d": "Big Drink",
        "s": "Snack"
    },
    logging: {
        stdout: true,
        db: true,
        file: true,
        db_data: {
            host: 'localhost',
            port: 27017,
            db: 'drink_log_dev'
        }
    }
}

