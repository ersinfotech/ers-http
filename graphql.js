const { graphiql } = require('graphql-ready')
const GraphiqlAuth = require('./@ersinfotech/graphiql-auth')

module.exports = (
  app,
  config,
  { schema, api, resolver, gql = [] },
  restrict,
) => {
  const graphLogin = (callbackUrl) =>
    GraphiqlAuth({
      eadminBaseUrl: config.eadmin.baseUrl,
      clientId: config.clientId,
      callbackUrl,
    })

  const graphiqlGetNotFound = (req, res, next) => {
    const re = new RegExp(`${req.baseUrl}/login$`)
    if (req.method === 'GET' && !re.test(req.headers.referer)) {
      return res.status(404).end('Not Found')
    } else if (
      req.method === 'POST' &&
      /__schema/.test(req.body.query) &&
      !/ers-http=\d+/.test(req.headers['x-ers-http'] || req.headers.cookie)
    ) {
      return res.status(400).end('Not Found')
    }
    next()
  }

  const graphin = graphLogin('../graphql')

  app.route('/login').get(graphin.get).post(graphin.post)

  const graphql = graphiql({ schema, api, resolver })

  app.use('/', graphiqlGetNotFound, restrict(), gql, graphql)
}
