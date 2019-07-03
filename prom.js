
const onFinished = require('on-finished')
const Prometheus = require('prom-client')

function requestDurationGenerator (buckets) {
  return new Prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['route', 'method', 'status'],
    buckets,
  });
}

module.exports = (app, options = {}) => {

    const metricsPath = '/metrics'

    app.get(metricsPath, (req, res) => {
        res.set('Content-Type', Prometheus.register.contentType)
        res.end(Prometheus.register.metrics())
    })

    app.locals.Prometheus = Prometheus

    // Prometheus.collectDefaultMetrics()

    const requestDurationBuckets = [ 1, 5, 10, 30, 60 ]

    const requestDuration = requestDurationGenerator(requestDurationBuckets)

    const red = (req, res, next) => {

        const end = requestDuration.startTimer()

        onFinished(res, () => {

            let { statusCode: status } = res
            let { baseUrl: route = status, method } = req

            if (route === '') route = '/'

            end({route, method, status})
        })

        next()
    }

    app.use(red)

}
