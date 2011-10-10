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
    error_codes: {
        "OK_ALT": "",
        "OK": "OK: ",
        "100": 'ERR 100 Slot empty.',
        "101": 'ERR 101 Drop failed, contact an admin.',
        "102": 'ERR 102 Slot disabled.',
        "103": 'ERR 103 Unknown Failure.',
        "104": 'ERR 104 No slots available.',
        "150": 'ERR 150 Unable to initialize hardware for drop.',
        "151": 'ERR 151 Unable to communicate with hardware. Contact an admin.',
        "200": 'ERR 200 Access denied.',
        "201": 'ERR 201 USER command needs to be issued first.',
        "202": 'ERR 202 Invalid username or password.',
        "203": 'ERR 203 User is poor.',
        "204": 'ERR 204 You need to login.',
        "205": 'ERR 205 Maximum user count reached.',
        "206": 'ERR 206 Invalid number of args',
        "207": 'ERR 207 Invalid Ibutton',
        "400": 'ERR 400 Invalid admin flag.',
        "401": 'ERR 401 Invalid cost.',
        "402": 'ERR 402 Invalid credits.',
        "403": 'ERR 403 Invalid delay',
        "404": 'ERR 404 Invalid enable flag.',
        "405": 'ERR 405 Invalid num_dropped.',
        "406": 'ERR 406 Invalid parameters.',
        "407": 'ERR 407 Invalid password.',
        "408": 'ERR 408 Invalid quantity.',
        "409": 'ERR 409 Invalid slot.',
        "410": 'ERR 410 Invalid user.',
        "411": 'ERR 411 Invalid reboot flag.',
        "412": 'ERR 412 User already registered.',
        "413": 'ERR 413 No machine selected.',
        "414": 'ERR 414 Invalid machine name',
        "415": 'ERR 415 Invalid command'
    },
    machine_codes: {
        "ld": "Little Drink",
        "d": "Big Drink",
        "s": "Snack"
    }
}

