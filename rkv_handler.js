var o2s = JSON.stringify;
var s2o = JSON.parse;
var rdb = require('rethinkdb');

//shorthand on Promise
var	P=async(f)=>('function'==typeof f)?new Promise(f):f;
P.delay = (t) => P(resolve=>setTimeout(resolve,t>0?t:1));
P.all = (a=[]) => Promise.all(a);
P.reject = (o) => Promise.reject(o);
P.resolve = (o) => Promise.resolve(o);
var js = {
	md5 : s=>require('crypto').createHash('md5').update(s).digest("hex"),
	loop:(o,f)=>{for(var k in o){f(k,o[k])}},//(o,f)=>Object.entries(o).forEach(f)
	//async version of switch/case/default
	branch:async(a)=>{
		var rr;
		for(var [d,f] of a){
			var r = d();//TODO try await
			if(r){
				var [rst,donotbreak] = await f(r);
				rr = rst;
				if (donotbreak===true){
				}else break;//default break unless ===true
			}
		}
		return rr;
	},
	P,
};

//TODO  modularize
var rdb_helper = {
	hasDb: (conn,dbn) => rdb.dbList().contains(dbn).run(conn),
	hasDbTbl: (conn,dbn,tbl) => rdb.db(dbn).tableList().contains(tbl).run(conn),
	ensureDb: async(conn,dbn) => {
		if( ! await rdb_helper.hasDb(conn,dbn) ) await rdb.dbCreate(dbn).run(conn);
		return rdb_helper;
	},
	ensureDbTbl: async(conn,dbn,tbl) => {
		await rdb_helper.ensureDb(conn,dbn);
		if ( ! await rdb_helper.hasDbTbl(conn,dbn,tbl) ) await rdb.db(dbn).tableCreate(tbl).run(conn);
		return rdb_helper;
	}
};

module.exports = (init_opts={}) => async(req,resp)=>{
	var {argo={},conn,argo_rdb,
		pid,pm_id,fk_id,flagMaster,cpus,cluster_mode,start_time
	} = init_opts;
	var req_url = req.url;
	console.log({req_url})
	try{
		if(!conn) conn = await rdb.connect( argo_rdb );
		var req_url_o = require('url').parse(req_url,true//parseQueryString
		);
		resp.end(o2s(
			//case /appid/appkey
			await js.branch([
				[()=>req_url_o.pathname.match(new RegExp("/([^/]+)/(.+)")),async(m)=>{
					var {query} = req_url_o;
					var [path,appid,appkey] = m;
					var result;

					var dbn = js.md5(appid);
					var tbl = 'kv';//
					await rdb_helper.ensureDbTbl(conn,dbn,tbl);

					//TODO
					//if(query.deploy){
					// check (query.secret,appid) w/ gh, store into db('appsecret')
					//}
					if(query.update){
						//TODO check query.secret w/ db('appsecret') + POST
						var rst_replace = await rdb.db(dbn).table(tbl).get(appkey)
						//.replace({id:appkey,m:Math.random(),d:new Date()})
							.replace({id:appkey,rd:Math.random(),tm:new Date(),vl:query.update})
							.run(conn);
						console.log({rst_replace});
					}
					//TODO ensure after fail getting
					var rst_get = await rdb.db(dbn).table(tbl).get(appkey).run(conn);
					result = rst_get || {};
					result.now=new Date();
					return [result];
				}],
				//default:
				[()=>true,async()=>{
					var server = await conn.server();
					var cursor = await rdb.db('rethinkdb').table('server_status').run(conn);
					var result = await cursor.toArray();
					var rt = {
						pid,pm_id,fk_id,flagMaster,cpus,cluster_mode,start_time,
						server_count: result.length, server};
					var rta = [];
					js.loop(result,(k,v)=>{
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
					return [rt];
				}],
			])//js.branch()
		))
	}catch(ex){
		console.log(ex);
		if(ex && ex.name == 'ReqlDriverError') conn = null;
		resp.end(o2s(ex))
		//resp.end(o2s(ex))
	}
}
