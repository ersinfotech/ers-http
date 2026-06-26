const { readFileSync } = require('fs')
const jsonreq = require('../../jsonreq')
const login_html = readFileSync(__dirname + '/login.html', 'utf-8')

module.exports = ({ eadminBaseUrl, clientId, callbackUrl }) => ({
  get: (req, res) => {
    return res.send(login_html)
  },
  post: (req, res, next) => {
    const { email, password } = req.body
    jsonreq({
      url: eadminBaseUrl + '/oauth/signin',
      json: {
        client_id: clientId,
        email,
        password,
      },
    })
      .then(({ access_token }) => {
        res.cookie('ers-http', Date.now(), {
          httpOnly: true,
          sameSite: true,
        })
        res.redirect(callbackUrl + `?access_token=${access_token}`)
      })
      .catch(() => {
        next(new Error('login fail'))
      })
  },
})
