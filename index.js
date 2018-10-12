
const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const multer = require('multer')
const bunyan = require('bunyan')
const numeral = require('numeral')
const Restrict = require('./restrict')
const graphql = require('./graphql')

module.exports = (config, options) => {

    process.env.NODE_ENV = process.env.NODE_ENV || 'development'
    const name = config.clientId || 'clientId'

    const streams = process.env.NODE_ENV === 'production' && config.logPath
      ? [{stream: process.stdout}, {path: config.logPath}]
      : [{stream: process.stdout}]

    const logger = bunyan.createLogger({name, streams})
    process.on('uncaughtException', (err) => {
      logger.fatal(err)
      process.exit()
    })

    process.on('unhandledRejection', (err) => {
      logger.error(err);
    })

    const fileSize = options.uploadFileSize || 5 * 1024 * 1024 // 5mb
    const limit = options.postBodySize || '50mb'

    const error = (err, req, res, next) => {
      res.status(500)
      process.env.NODE_ENV === 'production'
        ? res.send({error: err.message})
        : res.send({error: err.message, stack: err.stack})
    }

    const app = express()
    .use(cors())
    .use(bodyParser.json({limit}))
    .use(bodyParser.urlencoded({limit, extended: true}))
    .use(bodyParser.text({limit, type: 'text/*'}))
    .use(multer({limits: {fileSize}}).any())

    const restrict = Restrict({
      baseUrl: config.eadmin.baseUrl,
    })

    if (options.graphql) {
        const gapi = require('express').Router()
        const goptions = options.graphql(logger, gapi)
        graphql(gapi, config, goptions, restrict)
        app.use('/graphql', gapi)
    }

    if (options.restful) {
        const rapi = require('express').Router()
        options.restful(logger, rapi)
        app.use('/api', restrict(), rapi)
    }

    if (options.public) {
        app.use('/public', express.static(options.public))
    }

    if (options.unrestrict) {
        const rapi = require('express').Router()
        options.unrestrict(logger, rapi)
        app.use('/', rapi)
    }

    app.use(error)

    const server = http.Server(app)

    if (options.io) {
        const io = require('socket.io')(server)

        if (options.redis) {
            const redisAdapter = require('socket.io-redis')
            io.adapter(redisAdapter(options.redis))
        }

        app.get('/socket.html', (req, res) => {
            res.sendFile(__dirname + '/socket.html')
        })

        io.use(restrict())
        options.io(logger, io)

        global.IO = io
    }

    const time = process.hrtime()
    const port = config.http && config.http.port || process.env.PORT || 3000
    const version = process.version

    server.listen(port, () => {
      const diff = process.hrtime(time)
      const second = (diff[0] * 1e9 + diff[1]) / 1e9
      logger.info(`[${version}] http service is listening on port ${port} in ${process.env.NODE_ENV} mode used ${numeral(second).format('0.00')} seconds`)
    })
}
