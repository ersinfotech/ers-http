
const http = require('.')

const schema = `
scalar JSON

type Query {
    echo(message: JSON!): JSON
}
`

const api = {
    echo ({message}) {
        return message
    }
}

const graphql = (logger) => {

    logger.info('graphql started')

    return {api, schema}
}

const restful = (logger, router) => {
    router.use('/hello', (req, res) => res.end('world'))
}

const unrestrict = (logger, router) => {
    router.use('/999', (req, res) => res.end('666'))
}

const io = (logger, IO) => {
    IO.on('connection', socket => {
        console.log('connected')
        socket.emit('hello', 'hello world')
    })
}

const config = {
    clientId: 'miner',
    eadmin: {
        baseUrl: 'http://eadmin-api.ersinfotech.com',
    },
}

http(config, {
    graphql,
    restful,
    unrestrict,
    io,
})
