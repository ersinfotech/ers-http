
const request = require('superagent')

module.exports = (options = {}) => {

    const {
        baseUrl,
    } = options

    if (!baseUrl) throw new Error('baseUrl required in restrict middleware')

    return () => (req, res, next) => {

        let query = req.query || {}

        if (req.handshake) {
            query = req.handshake.query
            next = res
        }

        const access_token = query.access_token

        if (!access_token) return next('access_token invalid')

        request.get(baseUrl + '/account/me/id')
            .query({access_token})
            .then(res => {
                if (res.error) return next('access_token invalid')

                const data = res.body || {}

                req.session = {
                    ...req.session,
                    userId: String(data.user_id),
                    groupId: String(data.group_id),
                    productId: String(data.product_id),
                    roleId: String(data.role_id),
                    lang: data.lang,
                    accessToken: access_token
                }

                next()
            })
            .catch(e => next('access_token fetching error'))
    }
}
