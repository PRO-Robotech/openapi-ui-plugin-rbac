const path = require('path')
const fs = require('fs').promises
import express, { Express } from 'express'
import cors from 'cors'
import http from 'http'
// const { createProxyMiddleware } = require('http-proxy-middleware')
import dotenv from 'dotenv'
// import { getDynamicIndex } from './getDynamicIndex'

dotenv.config()

const basePrefix = process.env.BASEPREFIX
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map(origin => origin.trim())

// let options: dotenv.DotenvParseOutput | undefined
// if (process.env.LOCAL === 'true') {
//   const { parsed } = dotenv.config({ path: './.env.options' })
//   options = parsed
// }

// const KUBE_API_URL = process.env.LOCAL === 'true' ? options?.KUBE_API_URL : process.env.KUBE_API_URL

// const TITLE_TEXT = process.env.LOCAL === 'true' ? options?.TITLE_TEXT : process.env.TITLE_TEXT

const healthcheck = require('express-healthcheck')
const promBundle = require('express-prom-bundle')

const metricsMiddleware = promBundle({ includeMethod: true, metricsPath: `${basePrefix ? basePrefix : ''}/metrics` })
const winston = require('winston')
const expressWinston = require('express-winston')

const app: Express = express()
const port = process.env.PORT || 8080

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins?.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
  }),
)

app.use(`${basePrefix ? basePrefix : ''}/healthcheck`, healthcheck())
app.use(metricsMiddleware)

if (process.env.LOGGER === 'true') {
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      timeStamp: true,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.json(),
      ),
      expressFormat: true,
      colorize: false,
      requestWhitelist: ['body'],
      responseWhitelist: ['body'],
    }),
  )
}

// const bffFormProxy =
//   process.env.LOCAL === 'true'
//     ? createProxyMiddleware({
//         target: BFF_URL,
//         changeOrigin: true,
//         secure: false,
//         ws: false,
//       })
//     : undefined

// // Only add proxies if LOCAL=true
// if (process.env.LOCAL === 'true') {
//   console.log('✅ Proxies are enabled.')
//   // Proxy: /api/clusters/.*/k8s/
//   app.use(
//     '/api/clusters/:clusterId/k8s',
//     createProxyMiddleware({
//       target: `${KUBE_API_URL}/api/clusters`,
//       changeOrigin: true,
//       secure: false,
//       ws: true,
//       pathRewrite: (path, req) => path.replace(/^\/api\/clusters\//, '/'),
//       // logLevel: 'debug',
//       // onProxyReq: (proxyReq, req, res) => {
//       //   console.debug(`[PROXY] ${req.method} ${req.originalUrl} -> ${proxyReq.getHeader('host')}${proxyReq.path}`)
//       // },
//     }),
//   )

//   // Proxy: /clusterlist
//   app.use(
//     '/clusterlist',
//     createProxyMiddleware({
//       target: `${KUBE_API_URL}/clusterlist`,
//       changeOrigin: true,
//       secure: false,
//       pathRewrite: (path, req) => path.replace(/^\/clusterlist/, ''),
//       // logLevel: 'debug',
//       // onProxyReq: (proxyReq, req, res) => {
//       //   console.debug(`[PROXY] ${req.method} ${req.originalUrl} -> ${proxyReq.getHeader('host')}${proxyReq.path}`)
//       // },
//     }),
//   )

//   // Proxy: /openapi-bff
//   app.use(
//     '/openapi-bff',
//     createProxyMiddleware({
//       target: BFF_URL,
//       changeOrigin: true,
//       secure: false,
//       // pathRewrite: (path, req) => path.replace(/^\/bff/, ''),
//       // logLevel: 'debug',
//       // onProxyReq: (proxyReq, req, res) => {
//       //   console.debug(`[PROXY] ${req.method} ${req.originalUrl} -> ${proxyReq.getHeader('host')}${proxyReq.path}`)
//       // },
//     }),
//   )

//   // Proxy: bffFormProxy
//   app.use('/openapi-bff-ws/forms', bffFormProxy)
// } else {
//   console.log('🚫 Proxies are disabled.')
// }

app.get(`${basePrefix ? basePrefix : ''}/env.js`, (_, res) => {
  res.set('Content-Type', 'text/javascript')
  res.send(
    `
    window._env_ = {
    ${basePrefix ? `  BASEPREFIX: "${basePrefix}"` : ''}
    }
    `,
  )
})

// app.get(`${basePrefix ? basePrefix : ''}/docs`, (_, res) => {
//   res.redirect(process.env.DOCUMENTATION_URI || '/')
// })

const tryFiles = async (req, res, next) => {
  try {
    const unsafeReqPath = basePrefix ? req.path.replace(basePrefix, '') : req.path
    const safeReqPath = path.normalize(unsafeReqPath).replace(/^(\.\.(\/|\\|$))+/, '')
    const filePath = path.join(__dirname, safeReqPath.replace(/^\//, ''))
    await fs.access(filePath)
    return res.sendFile(filePath)
  } catch (error: any) {
    // if (basePrefix) {
    //   const indexText = getDynamicIndex(basePrefix)
    //   res.set('Content-Type', 'text/html')
    //   return res.send(indexText)
    // }
    return res.sendFile('/index.html', {
      root: path.join(__dirname),
    })
  }
}

// app.get(`${basePrefix ? basePrefix : ''}/`, (_, res) => {
//   if (basePrefix) {
//     const indexText = getDynamicIndex(basePrefix)
//     res.set('Content-Type', 'text/html')
//     return res.send(indexText)
//   }
//   res.sendFile('/index.html', {
//     root: path.join(__dirname),
//   })
// })

app.get('*', (req, res, next) => {
  tryFiles(req, res, next)
})

const server = http.createServer(app)
server.listen(port, () => {
  console.log(`[server]: Server is running at port: ${port}`)
})

// server.on('upgrade', (req, socket, head) => {
//   if (process.env.LOCAL === 'true' && req.url?.indexOf('/openapi-bff-ws/forms') === 0) {
//     bffFormProxy.upgrade(req, socket, head)
//   }
// })
