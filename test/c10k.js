var cluster = require('cluster');
var http = require('http');
var cpus = require('os').cpus().length;

if (cluster.isMaster) {
	cluster.on('exit', (worker, code, signal)=>{
		console.log('worker %d died (%s). restarting...', worker.process.pid, signal || code);
		cluster.fork();
		console.log('[REFORK] Server running at http://127.0.0.1:8000/');
	});
	//for (var i = 0; i < cpus; i++) cluster.fork(); 
	//for(let j=cpus;j--;)cluster.fork();//fork cpus
	for(let j=cpus;j--;){//fork cpus-1, spare one always for master?
		cluster.fork();
		//console.log('[FORK] Server running at http://127.0.0.1:8000/');
	}
	console.log('[MASTER]');
} else {
	// Worker processes have a http server.
	http.Server(function(req, res) {
		res.writeHead(200);
		res.end("hello world\n"+Math.random());
		if(Math.random()>0.2){
			throw new Error('random fuck');
			//process.exit();//cluster is dead?
		}
	}).listen(8000);
	console.log('Server running at http://127.0.0.1:8000/');
}
