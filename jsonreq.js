const http = require('http')
const https = require('https')

const jsonreq = (params = {}) =>
  new Promise((resolve, reject) => {
    const { protocol, hostname, port, pathname, search } = URL.parse(params.url)

    let agent = null

    if (protocol === 'http:') {
      agent = http
    } else if (protocol === 'https:') {
      agent = https
    }

    if (!agent) {
      return reject(new Error(`invalid protocol ${protocol}`))
    }

    let options = {
      hostname,
      port,
      path: `${pathname}${search}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    let postData

    if (params.json && typeof params.json === 'object') {
      postData = JSON.stringify(params.json)
      options.method = 'POST'
      options.headers['Content-Length'] = Buffer.byteLength(postData)
    }

    // from nodejs.org/api/http.html
    const req = agent.request(options, (res) => {
      const { statusCode } = res
      const contentType = res.headers['content-type']

      let error

      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`)
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error(
          'Invalid content-type.\n' +
            `Expected application/json but received ${contentType}`,
        )
      }

      if (error) {
        res.resume()
        return reject(error)
      }

      res.setEncoding('utf8')

      let rawData = ''
      res.on('data', (chunk) => {
        rawData += chunk
      })
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData)
          resolve(parsedData)
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', (e) => reject(e))

    if (postData) {
      req.write(postData)
    }

    req.end()
  })

module.exports = jsonreq

// test
// ;(async () => {
//   const getResult = await jsonreq({
//     url: 'http://httpbin.org/get',
//   })
//
//   console.log({ getResult })
//
//   const postResult = await jsonreq({
//     url: 'http://httpbin.org/post',
//     json: { ok: true, message: 'hello world' },
//   })
//   console.log({ postResult })
//
//   const getResultHttps = await jsonreq({
//     url: 'https://httpbin.org/get',
//   })
//
//   console.log({ getResultHttps })
//
//   const postResultHttps = await jsonreq({
//     url: 'https://httpbin.org/post',
//     json: { ok: true, message: 'hello world' },
//   })
//   console.log({ postResultHttps })
// })()
