module.exports =
  (middleware, error, status = 500, forceError = false) =>
  async (req, res, next) => {
    try {
      await middleware(req, res, next)
    } catch (e) {
      if (forceError || process.env.NODE_ENV !== 'production') console.log(e)
      error = error || e
      let message = error.message || error
      res.status(status).send(message)
    }
  }
