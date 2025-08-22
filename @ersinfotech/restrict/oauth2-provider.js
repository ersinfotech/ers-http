const crypto = require('crypto')

function createDecipher(algorithm, password) {
  // OpenSSL-style key and IV derivation
  const keyIv = EVP_BytesToKey(algorithm, password)
  const key = keyIv.key
  const iv = keyIv.iv

  let decipher = crypto.createDecipheriv(algorithm, key, iv)
  let output = ''

  return {
    update: function (
      encryptedData,
      inputEncoding = 'binary',
      outputEncoding = 'utf8',
    ) {
      if (inputEncoding !== 'binary') {
        encryptedData = Buffer.from(encryptedData, inputEncoding)
      }

      const decryptedChunk = decipher.update(encryptedData)

      if (outputEncoding === 'binary') {
        return decryptedChunk
      } else {
        const chunkString = decryptedChunk.toString(outputEncoding)
        output += chunkString
        return chunkString
      }
    },

    final: function (outputEncoding = 'utf8') {
      try {
        const finalChunk = decipher.final()

        if (outputEncoding === 'binary') {
          return finalChunk
        } else {
          const finalString = finalChunk.toString(outputEncoding)
          output += finalString
          return finalString
        }
      } catch (error) {
        throw new Error('Decryption failed: ' + error.message)
      }
    },

    // Helper to get all decrypted data
    toString: function () {
      return output
    },
  }
}

// OpenSSL-compatible key derivation function
function EVP_BytesToKey(algorithm, password, salt = null) {
  let keyLen = getKeyLength(algorithm)
  let ivLen = getIVLength(algorithm)

  let key = Buffer.alloc(keyLen)
  let iv = Buffer.alloc(ivLen)
  let tmp = Buffer.alloc(0)

  const passwordBuffer = Buffer.from(password, 'binary')

  while (keyLen > 0 || ivLen > 0) {
    const hash = crypto.createHash('md5')
    hash.update(tmp)
    hash.update(passwordBuffer)
    if (salt) {
      hash.update(salt)
    }
    tmp = hash.digest()

    let used = 0

    if (keyLen > 0) {
      const keyStart = key.length - keyLen
      used = Math.min(tmp.length, keyLen)
      tmp.copy(key, keyStart, 0, used)
      keyLen -= used
    }

    if (used < tmp.length && ivLen > 0) {
      const ivStart = iv.length - ivLen
      const remaining = tmp.length - used
      const toCopy = Math.min(remaining, ivLen)
      tmp.copy(iv, ivStart, used, used + toCopy)
      ivLen -= toCopy
    }
  }

  return { key, iv }
}

function getKeyLength(algorithm) {
  const match = algorithm.match(/(aes|des)-(\d+)-/i)
  if (match) {
    return parseInt(match[2]) / 8
  }
  return 32 // Default to AES-256 key length
}

function getIVLength(algorithm) {
  if (algorithm.includes('aes')) return 16
  if (algorithm.includes('des')) return 8
  return 16 // Default IV length
}

/**
 * Return base64url signed sha1 hash of str using key
 */
function signStr(str, key) {
  var hmac = crypto.createHmac('sha1', key)
  hmac.update(str)
  return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

var CYPHER = 'aes256'
var CODE_ENCODING = 'hex'
var DATA_ENCODING = 'utf8'

const secureParse = function (str, encrypt_key, validate_key) {
  var expected_digest = str.substring(0, 28)
  var nonce_crypt = str.substring(28, 36)
  var encrypted_data = str.substring(36, str.length)

  var decypher = createDecipher(CYPHER, encrypt_key + nonce_crypt)
  var data = decypher.update(encrypted_data, CODE_ENCODING, DATA_ENCODING)
  data += decypher.final(DATA_ENCODING)
  var nonce_check = data.substring(0, 8)
  data = data.substring(8, data.length)
  var digest = signStr(data, validate_key + nonce_check)
  if (digest != expected_digest) throw new Error('Bad digest')
  return JSON.parse(data)
}

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
