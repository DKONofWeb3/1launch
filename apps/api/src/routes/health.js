const { Router } = require('express')

const healthRouter = Router()

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: '1launch-api',
    timestamp: new Date().toISOString(),
  })
})

module.exports = { healthRouter }
