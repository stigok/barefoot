const Socket = require('net').Socket

const ENCODING = 'utf8'
const EOL = '\r\n'
const DEFAULT_QUIT_MESSAGE = 'Sayonara!' 
const MAX_MESSAGE_LENGTH = 512 - EOL.length

class Client extends Socket {
  constructor (options) {
    super()
    this.setEncoding(ENCODING)
    this.options = options
    this.on('data', (data) => {
      data
        .split(/[\r\n]+/)
        .filter((line) => line.length)
        .forEach((line) => this._receive(line))
    })
  }

  connect () {
    if (!this.destroyed)
      return
    const opts = this.options
    super.connect(opts.port, opts.server, () => {
      this.nick(opts.nick)
      this.identify(opts.username, opts.hostname, opts.servername, opts.realname)
    })
  }

  send (str) {
    if (str.length > MAX_MESSAGE_LENGTH) {
      this.send(str.substr(MAX_MESSAGE_LENGTH))
      str = str.substr(0, MAX_MESSAGE_LENGTH)
    }
    super.write(str + EOL)
  }

  _receive (data) {
    const parts = data.split(' ')

    if (parts[0] && parts[1] === '376') {
      // Ready on 'End of /MOTD command'
      this.emit('ready')
    } else if (parts[0] && parts[0].toUpperCase() === 'PING') {
      this.emit('ping')
      this.send(`PONG ${parts[1]}`)
    } else if (parts[1] && parts[1].toUpperCase() === 'PRIVMSG') {
      this.emit('privmsg', {
        from: parts[0],
        to: parts[2],
        text: parts.slice(3).join(' ').substr(1)
      })
    } else {
      this.emit('unhandled', data)
    }
  }

  //
  // Helper methods
  //

  nick (nick) {
    this.send(`NICK ${nick}`, () => {
      this.emit('nick', nick)
    })
  }

  identify (username, hostname, servername, realname) {
    this.send(`USER ${username} ${hostname} ${servername} :${realname}`)
  }

  quit (message) {
    this.send(`QUIT :${message || DEFAULT_QUIT_MESSAGE}`)
  }

  // Allow both `say(to, text)` and `say(msg)`
  say (to, text) {
    const msg = (typeof to === 'object') ? to : {to, text}
    this.send(`PRIVMSG ${msg.to} :${msg.text}`)
  }
}

module.exports = Client

