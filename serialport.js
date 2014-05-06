var child_process = require("child_process")
	, stream = require("stream")
	, fs = require("fs")
	, tty = require("tty")
	, os = require("os")
	, util = require("util");

/* Implements a Duplex stream for reading from and writing to a serial port.

This implementation uses `stty` to initialize the stream; then, it simply reads
from or writes to the serial port using the "tty" Node.js library.

The options object allows you to pass named options to the serial port during
initialization. The valid attributes for the options object are the following:

- serialPort - the serial port device name (required)
- baudRate - Baud Rate (defaults to 9600)
- dataBits - Data Bits - Must be one of: 8, 7, 6, or 5. (defaults to 8)
- stopBits - Stop Bits - Must be one of: 1 or 2. (defaults to 1)
- parity - Parity - Must be one of: 'none', 'odd', 'even',
	'mark', 'space' (defaults to 'none')
- sttyPath - the path to the `stty` command (defaults to /bin/stty)
- initTimeout - maximum initialization duration (defaults to 10 seconds);
	set to `null` to allow an infinite amount of time
*/
function SerialPort(opts) {
	stream.Duplex.call(this, {
		//"allowHalfOpen": true
	});
	this.serialPort = opts.serialPort;
	this.baudRate = opts.baudRate || 9600;
	this.dataBits = opts.dataBits || 8;
	this.stopBits = opts.stopBits || 1;
	this.parity = opts.parity || 'none';
	this.sttyPath = opts.sttyPath || "/bin/stty";
	if(opts.initTimeout === undefined) {
		opts.initTimeout = 10000;
	}
	this.initTimeout = opts.initTimeout;
	this._readStream = null;
	this._writeStream = null;
}
util.inherits(SerialPort, stream.Duplex);
module.exports = SerialPort;

SerialPort.prototype.initialize = function(cb) {
	var self = this;
	//If there is no callback, then just emit errors
	if(typeof cb !== "function") {
		cb = function(err) {
			if(err) {
				self.emit("error", err);
			}
		};
	}
	//Check to see if initialization is complete
	if(self._readStream || self._writeStream) {
		return cb(new Error("SerialPort: Please close the port before reinitializing.") );
	}
	//Device name
	if(self.serialPort == null) {
		return cb(new Error("SerialPort: Path to serial port device was not specified.") );
	}
	var args = [];
	if(os.platform() === "linux") {
		args.push("-F");
	}
	else if(os.platform() === "darwin") {
		args.push("-f");
	}
	else {
		throw new Error("Operating system not supported.");
	}
	//Set a few sane options
	args.push(self.serialPort, "raw", "-onlcr", "-iexten", "-echo",
		"-echoe", "-echok", "-echoctl", "-echoke");
	//Baud rate
	args.push("speed", self.baudRate);
	//Data bits
	if(self.dataBits < 5 || self.dataBits > 8) {
		return cb(new Error("SerialPort: Data byte must be between 5 and 8 bits.") );
	}
	args.push("cs" + self.dataBits);
	//Stop bits
	if(self.stopBits === 2) {
		args.push("cstopb");
	}
	else if(self.stopBits === 1) {
		args.push("-cstopb");
	}
	else {
		return cb(new Error("SerialPort: Number of stop bits must be 1 or 2.") );
	}
	//Parity
	switch(self.parity) {
		case "none":
			args.push("-parenb");
			break;
		case "odd":
			args.push("parenb", "-parext", "parodd");
			break;
		case "even":
			args.push("parenb", "-parext", "-parodd");
			break;
		case "mark":
			args.push("parenb", "parext", "parodd");
			break;
		case "space":
			args.push("parenb", "parext", "-parodd");
			break;
		default:
			return cb(new Error("SerialPort: Invalid parity: " + self.parity) );
	}
	//Get the file descriptors for reading/writing the SerialPort
	fs.open(self.serialPort, "r+", function(err, readFd) {
		if(err) {
			return cb(err);
		}
		//Spawn stty process
		var child = child_process.spawn(self.sttyPath, args),
			initTimer;
		//Set a timer just in case the process hangs
		if(self.initTimeout != null) {
			initTimer = setTimeout(function() {
				child.removeListener("exit", exitListener);
				child.kill("SIGKILL");
				fs.closeSync(readFd);
				cb(new Error("SerialPort: stty did not complete in a timely manner") );
			}, self.initTimeout);
		}
		child.on("exit", exitListener);
		function exitListener(code, signal) {
			clearTimeout(initTimer);
			if(code === 0) {
				openSerialPortDevice(readFd);
			}
			else {
				fs.closeSync(readFd);
				cb(new Error("SerialPort: stty returned exit code " + code) );
			}
		}
	})
	//Once the process exits successfully, we call this function
	function openSerialPortDevice(readFd) {
		//Save TTY streams
		self._readStream = new tty.ReadStream(readFd);
		self._readStream.setRawMode(true);
		self._writeStream = self._readStream;
		//Setup error handlers
		self._readStream.on("error", function(err) {
			self.emit("error", err);
		});
		//Setup read event handlers
		self._readStream.on("data", function(chunk) {
			self.push(chunk);
		});
		self._readStream.on("end", function() {
			self.push(null);
		});
		self._readStream.on("close", function() {
			self.emit("close");
		});
		//Emit open event
		self.emit("open");
	}
};

SerialPort.prototype._read = function(size) {
	return;
};

SerialPort.prototype._write = function(chunk, encoding, cb) {
	whenOpen(this, function() {
		//cb is called once data is flushed
		this._writeStream.write(chunk, encoding, cb);
	});
};

SerialPort.prototype.close = function(cb) {
	var self = this;
	//If there is no callback, then just emit errors
	if(typeof cb !== "function") {
		cb = function(err) {
			if(err) {
				self.emit("error", err);
			}
		};
	}
	//Close both ReadStream and WriteStream Sockets
	self._readStream.end();
	self._readStream = self._writeStream = null;
	cb(null);
};

function whenOpen(self, cb) {
	if(self._writeStream == null) {
		self.on("open", cb);
	}
	else {
		cb.call(self);
	}
}