//pm2 stop rkv
//RKVPASS=???? && \
//pm2 start rkv.js -f -i max -- /port=8880 /r="{\"password\":\"$RKVPASS\"}" --watch . --ignore-watch="_logs *.db *.db*"
//node rkv /port=7890 /r="{\"password\":\"????\"}"
//pm2 stop rkv
//module.exports=function(Application)
(async({argo={},logger=console}={})=>{

	var start_time = new Date();
	var process = require('process');
	var {pid,env} = process;
	var {pm_id,fk_id} = env||{};
	var cpus = argo.cpus || require('os').cpus().length;
	var cluster_mode = "solo";

	//var no_daemon = false;//@ref affect nodenodenode behavior, i.e. skip listening..
	var pid = process.pid;//
	var pm_id = process.env.pm_id;
	var fk_id = process.env.fk_id;
	var flagMaster = true;
	var flagPm2 = false;

	var ProcPool={};
	var WorkerPool={};

	var pm2;
	if (pm_id>=0) {
		flagPm2 = true;
		pm2 = require('pm2');
		if(cpus>1){
			cluster_mode = "pm2"
			if( pm_id > 0 ) flagMaster=false;
		}
	}else{
		if(cpus>1){
			cluster_mode = "cluster"
			var cluster = require('cluster');
			if (cluster.isMaster) {
				var forkWorker = (fk_id) => {
					//NOTES: fk_id for debug only
					const worker = cluster.fork({fk_id});
					worker.on('disconnect', () => {
						logger.log(`worker${fk_id} disconnect, will auto launch again...`);
						forkWorker(fk_id);
					}).on('message',msgInfo=>process_on_message(msgInfo,4))
						.on('listening', (address) => logger.log(`worker${fk_id} was is listening: `,address))
						.on('online',()=>{
							logger.log(`NOTICE worker${fk_id} was online`,);
							WorkerPool[worker.process.pid]=worker;//store
						}).on('exit', (code, signal) => {
							delete WorkerPool[worker.process.pid];
							if (signal) { logger.log(`worker${fk_id} was killed by signal: ${signal}`); }
							else if (code !== 0) { logger.log(`worker${fk_id} exited with error code: ${code}`); }
							else { logger.log(`worker${fk_id} exit success ${code},${signal}`); }
						});
				};
				for (var i = 1; i < cpus; i++) forkWorker(i);//NOTES: only spawn cpus-1
			}else{
				flagMaster=false;
			}
		}
	}
	//if(flagMaster){
	//	if(cpus>1){
	//		no_daemon=true;
	//	}
	//}
	ProcPool[pid]={pid,pm_id,fk_id,flagMaster,
		//no_daemon,
		flagPm2};
	logger.log(`NOTICE: start cpus=${cpus}, cluster_mode=${cluster_mode}`,ProcPool,WorkerPool);

	///////////////////////////////////////
	var loop = (o,f)=>{for(var k in o){f(k,o[k])}};
	var o2s = JSON.stringify;
	var s2o = JSON.parse;
	//const o2o = (o1,o2)=>{for(var k in o2){o1[k]=o2[k]}return o1};
	var r = require('rethinkdb');
	var conn;
	console.log('connected rethinkdb')
	if(cpus==1 || !flagMaster)
		require('http').createServer()
			.on('error',console.log)
			.on('request',async(req,resp)=>{
				console.log('req',req.url)
				try{
					if(!conn){
						conn = await r.connect( s2o(argo.r||'null') );
					}
					var server = await conn.server();
					var cursor = await r.db('rethinkdb').table('server_status').run(conn);
					var result = await cursor.toArray();
					var rt = {
						pid,pm_id,fk_id,flagMaster,flagPm2,cluster_mode,
						start_time,
						server_count: result.length, server};
					var rta = [];
					loop(result,(k,v)=>{
						rta.push({
							id:v.id,
							time_started: v.process.time_started,
							time_started_diff:  new Date() - Date.parse(v.process.time_started),
							//canonical_addresses: v.network.canonical_addresses,
							time_connected: v.network.time_connected,
							time_connected_diff: new Date() - Date.parse(v.network.time_connected),
						})
					});
					rt.a = rta;
					console.log(result);
					resp.end(o2s(rt))
				}catch(ex){
					if(ex && ex.name == 'ReqlDriverError') conn = null;
					resp.end(o2s(ex))
				}
			})
			.listen({port:argo.port,host:argo.host||'0.0.0.0'})

})({argo:(a=>(a||require('process').argv||[]).reduce((r,e)=>((m=e.match(/^(\/|--?)([\w-]*)="?(.*)"?$/))&&(r[m[2]]=m[3]),r),{}))()});
