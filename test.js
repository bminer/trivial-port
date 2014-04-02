var SerialPort = require("./");
var port = new SerialPort({"baudRate": 115200, "serialPort": "/dev/ttyACM0"});
port.initialize();
port.on("data", function(chunk) {
	console.log("RX:", chunk.toString("ascii"))
});
port.write("AT+CSQ\r\n");
setTimeout(function() {
	console.log("Writing message again");
	port.write("ATZ\r\n");
}, 2000);
setTimeout(function() {
	console.log("Closing");
	port.close();
}, 5000);