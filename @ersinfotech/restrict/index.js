const jsonreq = require('../../jsonreq')
var { OAuth2Provider } = require('oauth2-provider')

module.exports = function Restrict(options) {
  options = options || {}
  var baseUrl = options.baseUrl
  var oauthSetting = options.oauth
  var oauth

  if (oauthSetting) {
    oauth = new OAuth2Provider(oauthSetting)
    oauth.on('access_token', (req, info, next) => {
      var { user_id, client_id, grant_date, extra_data } = info
      if (
        grant_date.getTime() +
          (oauthSetting.accessTokenTTL || 12 * 60 * 60 * 1000) <
        Date.now()
      ) {
        return next(new Error('access_token timeout'))
      }
      extra_data = extra_data || {}
      req.session = {
        ...req.session,
        ...extra_data,
        userId: user_id,
        clientId: client_id,
      }
      next()
    })
  } else if (!baseUrl) {
    throw new Error('oauth or baseUrl required in restrict middleware')
  }

  return function restrict(permission) {
    return function restrictHandler(req, res, next) {
      var access_token

      if (req.handshake) {
        access_token = req.handshake.access_token
        next = res
      } else if (req.query.access_token) {
        access_token = req.query.access_token
      } else if ((req.headers.authorization || '').indexOf('Bearer ') == 0) {
        access_token = req.headers.authorization.replace('Bearer', '').trim()
      } else {
        return res.status(400).send({ error: 'access_token required' })
      }

      req.session = req.session || {}
      req.session = {
        ...req.session,
        accessToken: access_token,
      }

      if (oauth) {
        oauth.login()(req, res, next)
      } else {
        jsonreq({
          url: baseUrl + '/account/me/id' + `?access_token=${access_token}`,
        })
          .then(function (body) {
            var data = body || {}
            req.session = {
              ...req.session,
              ...data,
            }
            return next()
          })
          .catch(function (err) {
            res.status(400).send({ error: 'access_token invalid' })
          })
      }
    }
  }
}
