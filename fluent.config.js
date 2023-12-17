//Do not edit this file directly
//Copy this file to your main app directory to make changes
const config = {
    components: [
        { name: 'datetime' },
        { name: 'device' },
        { name: 'event' },
        { name: 'expect' },
        { name: 'room' },
        { name: 'variable' },
        { name: 'scene' },
        //{ name: 'tuya' }
    ],
    logging: {
        levels: {
            default: 'debug',
        },
    },
    tuya: {
        uid: '',
        base_url: 'https://openapi.tuyaus.com',
        access_key: '',
        secret_key: '',
        username: '',
        password: ''
    }
}

module.exports = config
