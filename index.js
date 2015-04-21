let http = require('http')
let fs = require('fs')
let request = require('request')
let through = require('through')

let argv = require('yargs')
	.usage('\nUsage: $0 [options]')
  	.help('help').alias('help', 'h')
  	.version('1.0.0', 'version').alias('version', 'V')
  	.options({
    	logFile: {
      		description: "Log file name"
    	},
    	url: {
      		description: "Destination server URL"
    	},
    	host: {
      		description: "Destination server host",
      		default: '127.0.0.1'
    	},
    	port: {
      		description: "Destination server port",
      		default: '8000'
    	}
  	})
  	.example('$0 --host localhost', 'Proxies requests to http://localhost:8000')
  	.example('$0 --port 9000', 'Proxies requests to http://127.0.0.1:9000')
  	.example('$0 --url http://www.google.com', 'Proxies requests to http://www.google.com')
  	.example('$0 --logFile /tmp/node-proxy.log', 'Logs to /tmp/node-proxy.log')
	.epilog('For more information visit codepath.com')
	.argv
let scheme = 'http://'
let port = argv.port || argv.host === '127.0.0.1' ? 8000 : 80	
let destinationUrl = argv.url || scheme + argv.host + ':' + port
let logStream = argv.logFile ? fs.createWriteStream(argv.logFile) : process.stdout

http.createServer((req, res) => {
	logStream.write(`\nRequest received at: ${req.url}`)
	for (let header in req.headers) {
		res.setHeader(header, req.headers[header])
	}
	
	logStream.write('\nEcho Request:\n' + JSON.stringify(req.headers))
	through(req, logStream, {autoDestroy: false})
	req.pipe(res)
}).listen(8000)

http.createServer((req, res) => {
	logStream.write(`\nProxying request to: ${destinationUrl + req.url}`)
	
	let url
	if (req.headers['x-destination-url']) {
    	url = req.headers['x-destination-url']
    	delete req.headers['x-destination-url']
  	} else {
    	url = destinationUrl + req.url
  	}

	let options = {
		method: req.method,
		headers: req.headers,
		url:url
	}

	logStream.write('\nProxy Request:\n' + JSON.stringify(req.headers))
	through(req, logStream, {autoDestroy: true})

  	let response = req.pipe(request(options))
  	through(response, logStream, {autoDestroy: false})
  	response.pipe(res)
}).listen(8001)

console.log(`Accepting requests at: http://127.0.0.1:8001`)
console.log(`Proxying requests to: ${destinationUrl}`)
