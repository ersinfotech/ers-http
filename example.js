
const http = require('.')

const schema = `
scalar JSON

type Group {
    userId: String
    userName: String
}

type Groups {
    count: Int
    data: [Group]
}

type Query {
    echo(message: JSON!): JSON
    groups: Groups
}
`

const api = {
    echo ({message}) {
        return message
    }
}

const resolver = {
    Query: {
        groups () {
            return {count: 2, data: [{userId: 'userId'}]}
        },
    },
    Group: {
        userName (group) {
            return `${group.userId}-userName`
        }
    },
}

const graphql = (logger) => {

    logger.info('graphql started')

    return {api, schema, resolver}
}

const restful = (logger, router, restrict) => {
    router.use('/hello', restrict(), (req, res) => res.end('world'))
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
    io,
})
