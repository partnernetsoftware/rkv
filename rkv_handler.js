//var loop = (o,f)=>Object.entries(o).forEach(f);
var loop = (o,f)=>{for(var k in o){f(k,o[k])}};
var o2s = JSON.stringify;
var s2o = JSON.parse;
var rdb = require('rethinkdb');
module.exports = (init_opts={}) => async(req,resp)=>{
	var {argo={},conn,argo_rdb,
		pid,pm_id,fk_id,flagMaster,cpus,cluster_mode,start_time
	} = init_opts;
	console.log('req',req.url)
	try{
		if(!conn){
			console.log({argo_rdb});
			conn = await rdb.connect( argo_rdb );
		}
		var server = await conn.server();
		var cursor = await rdb.db('rethinkdb').table('server_status').run(conn);
		var result = await cursor.toArray();
		var rt = {
			pid,pm_id,fk_id,flagMaster,cpus,cluster_mode,start_time,
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
		//console.log(ex);
		if(ex && ex.name == 'ReqlDriverError') conn = null;
		resp.end(o2s({ex}))
	}
}
