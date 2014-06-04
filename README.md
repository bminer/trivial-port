trivial-port
============

Node.js library to open serial ports for reading and writing

Operating System Support
------------------------
- **Linux** - Works
- **Mac OSX** - May work with a few minor tweaks
- **Windows** - It should work using the [`MODE`]
(http://www.computerhope.com/modehlp.htm) command instead of `stty`.
Checkout [this StackOverflow post](http://stackoverflow.com/questions/5728691/nodejs-reading-tty-serial)

Why?
----
Node doesn't really support talking to serial ports at the moment.

Usage
-----
```javascript
var SerialPort = require("trivial-port");
var port = new SerialPort();
port.initialize();
port.on("data", function(chunk) {
	console.log("Incoming:", chunk);
})
port.write("Hello, World!");
```

Trivial-port implements a [Duplex stream](http://nodejs.org/api/stream.html#stream_class_stream_duplex)
for reading from and writing to a serial port.

This implementation uses [`stty`](http://www.freebsd.org/cgi/man.cgi?query=stty&sektion=1)
to initialize the stream; then, it simply reads from or writes to the serial
port using the [`tty` Node.js library](http://nodejs.org/api/tty.html).


### `var port = new SerialPort(options);`

The options object allows you to pass named options to the serial port during
initialization. The valid attributes for the options object are the following:

- `serialPort` - the serial port device name (required)
- `baudRate` - Baud Rate (defaults to 9600)
- `dataBits` - Data Bits - Must be one of: 8, 7, 6, or 5. (defaults to 8)
- `stopBits` - Stop Bits - Must be one of: 1 or 2. (defaults to 1)
- `parity` - Parity - Must be one of: 'none', 'odd', 'even',
	'mark', 'space' (defaults to 'none')
- `sttyPath` - the path to the `stty` command (defaults to /bin/stty)
- `initTimeout` - maximum initialization duration (defaults to 10 seconds);
	set to `null` to allow an infinite amount of time
- `customArgs` - an array of additional arguments to pass to the `stty` command

### `port.initialize([cb])`

Sets the appropriate serial port options and opens the serial port.  If `cb`
is specified, it is called when the port has been opened. `cb` is of the form
`cb(err)`.

### `port.close([cb])`

Closes the serial port.  If `cb` is specified, it is called when the port
has been closed.  `cb` is of the form `cb(err)`.

### Lots more methods

The `SerialPort` class inherits all of the methods and events of [Readable]
(http://nodejs.org/api/stream.html#stream_class_stream_readable) and [Writable]
(http://nodejs.org/api/stream.html#stream_class_stream_writable) interfaces.