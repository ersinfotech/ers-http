const { secureParse } = require('./serializer')

class OAuth2Provider {
  constructor({ crypt_key, sign_key, accessTokenTTL }) {
    this.encrypt_key = crypt_key
    this.validate_key = sign_key
    this.accessTokenTTL = accessTokenTTL
  }

  parse(access_token) {
    const [user_id, client_id, grant_date, extra_data = {}] = secureParse(
      access_token,
      this.encrypt_key,
      this.validate_key,
    )
    if (
      grant_date + (this.accessTokenTTL || 12 * 60 * 60 * 1000) <
      Date.now()
    ) {
      throw new Error('access_token timeout')
    }
    return {
      ...extra_data,
      userId: user_id,
      clientId: client_id,
    }
  }
}

exports.OAuth2Provider = OAuth2Provider
