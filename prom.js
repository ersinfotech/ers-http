
const onFinished = require('on-finished')
const Prometheus = require('prom-client')

const up = new Prometheus.Gauge({
  name: 'up',
  help: '1 = up, 0 = not up'
});

const requestCount = new Prometheus.Counter({
  name: 'http_requests_total',
  help: 'Counter for total requests received',
  labelNames: ['route', 'method', 'status'],
});

function requestDurationGenerator (buckets) {
  return new Prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['route', 'method', 'status'],
    buckets,
  });
}

module.exports = (app) => {

    const metricsPath = '/metrics'

    app.get(metricsPath, (req, res) => {
        res.set('Content-Type', Prometheus.register.contentType)
        res.end(Prometheus.register.metrics())
    })

    app.locals.Prometheus = Prometheus

    Prometheus.collectDefaultMetrics()

    up.set(1)

    const requestDurationBuckets = [ 0.05, 0.1, 0.3, 0.5, 0.8, 1, 1.5, 2, 3, 5, 10 ]

    const requestDuration = requestDurationGenerator(requestDurationBuckets)

    const ResponseTime = (handler) => (req, res, next) => {
        const start = Date.now()

        onFinished(res, () => {
            const time = Date.now() - start
            handler(req, res, time)
        })

        next()
    }

    const red = ResponseTime((req, res, time) => {

        const { statusCode: status } = res
        const { baseUrl: route = status, method } = req

        requestCount.inc({ route, method, status })

        requestDuration.labels(route, method, status).observe( time )
    })

    app.use(red)

}
