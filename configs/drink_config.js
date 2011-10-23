/**
 * Production configuration file
 */
exports.config = {
    machine_server: {
        host: 'erlang.csh.rit.edu',
        port: 4343
    },
    tini_ips: {
        '129.21.50.36': 's',
        '129.21.50.19': 'ld',
        '129.21.50.18': 'd'
    },
    machine_ip_mapping: {
        '129.21.49.106': 'd',
        '129.21.49.105': 'ld',
        '129.21.49.107': 's'

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
    error_codes: require('./drink_response_codes.js').codes,
    machine_codes: {
        "ld": "Little Drink",
        "d": "Big Drink",
        "s": "Snack"
    },
    logging: {
        stdout: false,
        db: true,
        file: true,
        db_data: {
            host: 'seanmcgary.com',
            port: 27017,
            db: 'drink_log'
        }
    }
}

