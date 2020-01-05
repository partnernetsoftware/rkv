//module.exports=function(Application)
const fs = require('fs');
(async({argo={},logger=console}={})=>{

	var start_time = new Date();
	var process = require('process');
	var {pid,env} = process;
	var {pm_id,fk_id} = env||{};
	var cpus = argo.cpus || require('os').cpus().length;
	var cluster_mode = "solo";

	var pid = process.pid;//
	var pm_id = process.env.pm_id;
	var fk_id = process.env.fk_id;
	var flagMaster = true;//master might need to do more singleton job when cpus>1
	var flagPm2 = false;
	var ProcPool={};
	var WorkerPool={};
	var pm2;
	if (pm_id>=0) {
		flagPm2 = true;
		pm2 = require('pm2');
		if(cpus>1){
			cluster_mode = "pm2"
			if( pm_id > 0 ) flagMaster=false;//pm2 mode using first as master...
		}
	}else{
		if(cpus>1){
			cluster_mode = "cluster"
			var cluster = require('cluster');
			if (cluster.isMaster) {
				//cluster.on('exit', (worker, code, signal)=>{
				//	console.log('worker %d died (%s). restarting...', worker.process.pid, signal || code);
				//	cluster.fork();
				//	console.log('[REFORK] Server running at http://127.0.0.1:8000/');
				//});
				var forkWorker = (fk_id) => {
					//NOTES: fk_id for debug only
					const worker = cluster.fork({fk_id});
					worker.on('disconnect', () => {
						logger.log(`worker${fk_id} disconnect, will auto launch again...`);
						forkWorker(fk_id);
					}).on('message',msgInfo=>process_on_message(msgInfo,4))
						.on('listening', (address) => logger.log(`worker${fk_id} is listening: `,address))
						.on('online',()=>{
							logger.log(`NOTICE worker${fk_id} is online`,);
							WorkerPool[worker.process.pid]=worker;//store
						}).on('exit', (code, signal) => {
							delete WorkerPool[worker.process.pid];
							if (signal) { logger.log(`worker${fk_id} is killed by signal: ${signal}`); }
							else if (code !== 0) { logger.log(`worker${fk_id} exited with error code: ${code}`); }
							else { logger.log(`worker${fk_id} exit success ${code},${signal}`); }
						});
				};
				//for (var i = 1; i < cpus; i++)
				for(let j=cpus;j--;)
					forkWorker(j);
			}else{
				flagMaster=false;
			}
		}
	}
	ProcPool[pid]={pid,pm_id,fk_id,flagMaster,flagPm2};
	logger.log(`NOTICE: start cpus=${cpus}, cluster_mode=${cluster_mode}`,ProcPool,WorkerPool);

	///////////////////////////////////////
	console.log({argo})
	var argo_rdb = JSON.parse(argo.r||'null');//TODO get from stdin also
	//const o2o = (o1,o2)=>{for(var k in o2){o1[k]=o2[k]}return o1};
	//TODO manually reload the handler again when updated...
	var conn;//
	var rkv_handler = require('./rkv_handler')({argo,conn,
		pid,pm_id,fk_id,
		flagMaster,cpus, flagPm2,
		cluster_mode,
		start_time,
		argo_rdb,
	});
	if(cpus==1 || !flagMaster){
		((argo.HTTPS_KEY) ? 
			require('https').createServer({key: fs.readFileSync(argo.HTTPS_KEY),cert: fs.readFileSync(argo.HTTPS_CERT)})
			: require('http').createServer()
		).on('error',console.log).on('request', rkv_handler).listen({port:argo.port,host:argo.host||'0.0.0.0'})
	}

})({argo:(a=>(a||require('process').argv||[]).reduce((r,e)=>((m=e.match(/^(\/|--?)([\w-]*)="?(.*)"?$/))&&(r[m[2]]=m[3]),r),{}))()});
