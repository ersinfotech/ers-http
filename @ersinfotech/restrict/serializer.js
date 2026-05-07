var crypto = require('crypto')
function randomString(bits) {
  var rand,
    i,
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
    ret = ''
  while (bits > 0) {
    rand = Math.floor(Math.random() * 0x100000000)
    for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6)
      ret += chars[0x3f & (rand >>> i)]
  }
  return ret
}

exports.stringify = function (obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64')
}

exports.parse = function (str) {
  return JSON.parse(Buffer.from(str, 'base64').toString('utf8'))
}

function signStr(str, key) {
  var hmac = crypto.createHmac('sha1', key)
  hmac.update(str)
  return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

function deriveKey(password) {
  return crypto.createHash('sha256').update(password).digest()
}

function evpBytesToKey(password, keyLen, ivLen) {
  var d = Buffer.alloc(0)
  var tmp = Buffer.alloc(0)
  var passBuf = Buffer.from(password, 'utf8')
  while (d.length < keyLen + ivLen) {
    tmp = crypto
      .createHash('md5')
      .update(Buffer.concat([tmp, passBuf]))
      .digest()
    d = Buffer.concat([d, tmp])
  }
  return {
    key: Uint8Array.prototype.slice.call(d, 0, keyLen),
    iv: Uint8Array.prototype.slice.call(d, keyLen, keyLen + ivLen),
  }
}

var CYPHER = 'aes-256-cbc'
var CODE_ENCODING = 'hex'
var DATA_ENCODING = 'utf8'
var IV_LENGTH = 16

exports.secureStringify = function (obj, encrypt_key, validate_key) {
  var nonce_check = randomString(48)
  var nonce_crypt = randomString(48)
  var iv = crypto.randomBytes(IV_LENGTH)
  var key = deriveKey(encrypt_key + nonce_crypt)
  var cypher = crypto.createCipheriv(CYPHER, key, iv)
  var data = JSON.stringify(obj)
  var res = cypher.update(nonce_check, DATA_ENCODING, CODE_ENCODING)
  res += cypher.update(data, DATA_ENCODING, CODE_ENCODING)
  res += cypher.final(CODE_ENCODING)
  var digest = signStr(data, validate_key + nonce_check)
  return digest + nonce_crypt + iv.toString('hex') + res
}

exports.secureParse = function (str, encrypt_key, validate_key) {
  var expected_digest = str.substring(0, 28)
  var nonce_crypt = str.substring(28, 36)

  var decrypted
  var nonce_check
  var data
  var digest

  // Try new format first (with IV in string)
  if (str.length > 68) {
    try {
      var iv_hex = str.substring(36, 68)
      var encrypted_data = str.substring(68)
      if (/^[0-9a-f]{32}$/i.test(iv_hex)) {
        var iv = Buffer.from(iv_hex, 'hex')
        var key = deriveKey(encrypt_key + nonce_crypt)
        var decypher = crypto.createDecipheriv(CYPHER, key, iv)
        decrypted = decypher.update(
          encrypted_data,
          CODE_ENCODING,
          DATA_ENCODING,
        )
        decrypted += decypher.final(DATA_ENCODING)
        nonce_check = decrypted.substring(0, 8)
        data = decrypted.substring(8)
        digest = signStr(data, validate_key + nonce_check)
        if (digest === expected_digest) {
          return JSON.parse(data)
        }
      }
    } catch (e) {
      // Fall through to old format
    }
  }

  // Fall back to old format (EVP_BytesToKey derivation)
  var encrypted_data_old = str.substring(36)
  var derived = evpBytesToKey(encrypt_key + nonce_crypt, 32, 16)
  var decypher = crypto.createDecipheriv(CYPHER, derived.key, derived.iv)
  decrypted = decypher.update(encrypted_data_old, CODE_ENCODING, DATA_ENCODING)
  decrypted += decypher.final(DATA_ENCODING)
  nonce_check = decrypted.substring(0, 8)
  data = decrypted.substring(8)
  digest = signStr(data, validate_key + nonce_check)
  if (digest != expected_digest) throw new Error('Bad digest')
  return JSON.parse(data)
}

function SecureSerializer(encrypt_key, validate_key) {
  this.encrypt_key = encrypt_key
  this.validate_key = validate_key
}

SecureSerializer.prototype = {
  stringify: function (obj) {
    return exports.secureStringify(obj, this.encrypt_key, this.validate_key)
  },
  parse: function (str) {
    return exports.secureParse(str, this.encrypt_key, this.validate_key)
  },
}

exports.createSecureSerializer = function (encrypt_key, validate_key) {
  return new SecureSerializer(encrypt_key, validate_key)
}

exports.randomString = randomString
