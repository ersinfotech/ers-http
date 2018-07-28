
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

    return {api, logger}
}

const restful = (logger, router) => {
    router.use('/hello', (req, res) => res.end('world'))
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
})
