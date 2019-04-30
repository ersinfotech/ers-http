const request = require('request-promise')

module.exports = (options = {}) => {
  const { baseUrl } = options

  if (!baseUrl) throw new Error('baseUrl required in restrict middleware')

  return () => (req, res, next) => {
    const error = message => next(new Error(message))

    let query = req.query || {}

    if (req.handshake) {
      query = req.handshake.query
      next = res
    }

    const access_token = query.access_token

    if (!access_token) return error('access_token required')

    request({
      url: baseUrl + '/account/me/id',
      qs: { access_token },
      json: true,
    })
      .then(res => {
        if (res.error) return error('access_token invalid')

        const data = res.body || {}

        req.session = {
          ...req.session,
          userId: String(data.user_id),
          groupId: String(data.group_id),
          productId: String(data.product_id),
          roleId: String(data.role_id),
          lang: data.lang,
          accessToken: access_token,
        }

        next()
      })
      .catch(e => error('access_token fetching error'))
  }
}
