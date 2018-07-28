
const {graphiql} = require('graphql-ready')
const Restrict = require('@ersinfotech/restrict')
const GraphiqlAuth = require('@ersinfotech/graphiql-auth')

module.exports = (app, config, {schema, api}) => {

    const restrict = Restrict({
      baseUrl: config.eadmin.baseUrl,
    })

    const graphLogin = (callbackUrl) => GraphiqlAuth({
      eadminBaseUrl: config.eadmin.baseUrl,
      clientId: config.clientId,
      callbackUrl,
    })

    const graphiqlGetNotFound = (req, res, next) => {
      const re = new RegExp(`${req.baseUrl}/login$`)
      if (req.method === 'GET' && !re.test(req.headers.referer)) {
        return res.status(404).end('Not Found')
      }
      next()
    }

    const graphin = graphLogin('../graphql')

    app.route('/login')
    .get(graphin.get)
    .post(graphin.post)

    const graphql = graphiql({schema, api})

    app.use('/', graphiqlGetNotFound, restrict(), graphql)
}
