const assert = require('assert')
const net = require('net')
const Client = require('../')

const HOST = '127.0.0.1'
const PORT = 16667

const testDefaults = {
  port: PORT,
  host: HOST,
  nick: 'nick',
  username: 'username',
  hostname: 'hostname',
  servername: 'servername',
  realname: 'realname'
}

const createServer = (onConnect, onServerCreated) => {
  const server = net.createServer(onConnect)
  server.listen(PORT, HOST, 0, onServerCreated)
  return server
}

const createClient = (overrides) => {
  const opts = Object.assign({}, testDefaults, overrides)
  return new Client(opts)
}

describe('Client', function () {
  this.timeout(2000)

  describe('constructor', function () {
    it('should create a Client', function () {
      client = createClient()
      assert.ok(client)
      assert.ok(client instanceof Client)
    })
  })

  describe('Server stuff', function (done) {
    let server
    let client

    beforeEach(function (done) {
      server = createServer(() => {}, () => done())
    })

    afterEach(function (done) {
      server.close(() => done())
    })

    it('should connect to the server', function (done) {
      const client = createClient()
      client.connect(() => {
        client.end()
      })
      client.on('close', () => done())
    })

    it('should destroy underlying socket on destroy()', function (done) {
      const client = createClient()
      const exception = Symbol('exception')

      client.on('error', (err) => {
        assert.deepStrictEqual(err, exception, 'Error is not the expected exception object')
        done()
      })

      client.connect(() => {
        client.destroy(exception)
      })
    })

    it('should set nick on connect', function (done) {
      server.once('connection', (sock) => {
        sock.on('data', (data) => {
          assert(data)
          // TODO: I don't know why data is buffered. two lines arrive on connect
          const str = data.toString()
          assert(str.startsWith('NICK ' + testDefaults.nick))
          done()
          sock.end()
        })
      })

      const client = createClient()
      client.connect()
    })

    it('##say() calls on send()', function (done) {
      const client = createClient()
      let probe = 0
      client.connect(() => {
        // Wait until connected to not catch identify() calls
        client.send = () => {
          probe++
        }
        client.say('john', 'hello, world!')
      })


      setTimeout(() => {
        assert.equal(probe, 1)
        client.destroy()
        done()
      }, 25)

    })
  })
})

