var o2s = JSON.stringify;
var s2o = JSON.parse;
var rdb = require('rethinkdb');

//happy-advance-js-ing:
var	P=async(f)=>('function'==typeof f)?new Promise(f):f;
P.delay = (t) => P(resolve=>setTimeout(resolve,t>0?t:1));
P.all = (a=[]) => Promise.all(a);
P.reject = (o) => Promise.reject(o);
P.resolve = (o) => Promise.resolve(o);
var js = {
	md5 : s=>require('crypto').createHash('md5').update(s).digest("hex"),
	loop:(o,f)=>{for(var k in o){f(k,o[k])}},//(o,f)=>Object.entries(o).forEach(f)
	branch:async(a)=>{
		var rr;
		for(var [d,f] of a){
			let r = d();
			if(r){
				var [rst,donotbreak] = await f(r);
				rr = rst;
				if (donotbreak===true){
				}else break;//default break
			}
		}
		//console.log(d,rr);
		return rr;
	},
	P,
};

//TODO 
var rdb_helper = {
	that: ()=>rdb_helper,
	hasDb: (conn,dbn) => rdb.dbList().contains(dbn).run(conn),
	hasDbTbl: (conn,dbn,tbl) => rdb.db(dbn).tableList().contains(tbl).run(conn),
	ensureDb: async(conn,dbn) => {
		var flg = await rdb_helper.hasDb(conn,dbn);
		if (!flg) {
			await rdb.dbCreate(dbn).run(conn);
		}
		return rdb_helper;
	},
	ensureDbTbl: async(conn,dbn,tbl) => {
		await rdb_helper.ensureDb(conn,dbn);

		//var flg = await rdb.db(dbn).tableList().contains(tbl).run(conn);
		var flg = await rdb_helper.hasDbTbl(conn,dbn,tbl);
		if (!flg) {
			console.log('DEBUG rdb_helper.ensureDbTbl',{flg})
			await rdb.db(dbn).tableCreate(tbl).run(conn);
		}
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
		if(!conn){
			//console.log({argo_rdb});
			conn = await rdb.connect( argo_rdb );
		}
		var m;
		var req_url_o = require('url').parse(req_url,true//parseQueryString
		);
		var rt = await js.branch([
			[()=>(req_url_o.pathname.match(new RegExp("/([^/]+)/(.+)"))),async(m)=>{
				var {query} = req_url_o;
				var [path,appid,appkey] = m;
				var result;

				var dbn = js.md5(appid);
				var tbl = 'kv';//
				await rdb_helper.ensureDbTbl(conn,dbn,tbl);

				var rst_replace = await rdb.db(dbn).table(tbl).get(appkey)
					.replace({id:appkey,m:Math.random(),d:new Date()})
					.run(conn);
				console.log({rst_replace});

				var rst_get = await rdb.db(dbn).table(tbl).get(appkey)
					.run(conn);
				console.log({rst_get});
				result = rst_get;

				var rst_db_a = await rdb.dbList().run(conn);
				console.log({rst_db_a})

				//result = await cursor.toArray();
				
//				try{
//					var cursor = await rdb.db(js.md5(appid)).table('kv').get(appkey).run(conn);
//					if(cursor==null){
//						var cursor = await rdb.db(js.md5(appid)).table('kv').get(appkey)
//							.replace({m:Math.random(),d:new Date()})
//							.run(conn);
////					var cursor = await rdb.db(js.md5(appid)).table('kv').get(appkey).run(conn);
////							result = await cursor.toArray();
//					}else{
//						result = await cursor.toArray();
//					}
//				}catch(ex){
//					console.log('DEBUG2',ex,query);
//					if(query.update){
//						try{
//							//var rstDbCreate = await rdb.dbCreate(js.md5(appid)).run(conn);
//							//console.log({rstDbCreate});
//							//var rstTblCreate = await rdb.db(js.md5(appid)).tableCreate('kv').run(conn);
//							//console.log({rstTblCreate});
//							var cursor = await rdb.db(js.md5(appid)).table('kv').get(appkey)
//								.replace({m:Math.random(),d:new Date()})
//								.run(conn);
//							result = await cursor.toArray();
//						}catch(ex){
//							console.log('DEBUG1',ex);
//							result = {errmsg:ex.name};
//						}
//					}else{
//						result = {errmsg:ex.name};
//					}
//				}
				
				//switch(act){
				//	case 'deploy':
				//		//{ headers:{ 'Content-Type': 'application/json', Authorization: gh_token ? `token ${gh_token}` : null,
				//		//	Accept:'application/vnd.github.v3.raw'}, url, method, 'Accept-Encoding':'deflate' }
				//		break;
				//	case 'upload':
				//		try{
				//			var appid = act;
				//			var appkey = key;
				//			var cursor = await rdb.db(js.md5(appid)).table('kv').get(appkey).replace({m:Math.random(),d:new Date()}).run(conn);
				//			result = await cursor.toArray();
				//		}catch(ex){
				//			console.log('DEBUG',ex);
				//			result = {errmsg:ex.name};
				//		}
				//		break;
				//	default://download
				//		//assume get({appid:act,key})
				//		try{
				//			var appid = act;
				//			var cursor = await rdb.db(js.md5(appid)).table('kv').run(conn);
				//			result = await cursor.toArray();
				//		}catch(ex){
				//			console.log('DEBUG',ex);
				//			result = {errmsg:ex.name};
				//		}
				//}
				//return [{path,act,key,query,result}]
				return [result];
			}],
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
		])
		resp.end(o2s(rt))
	}catch(ex){
		console.log(ex);
		if(ex && ex.name == 'ReqlDriverError') conn = null;
		resp.end(o2s(ex))
		//resp.end(o2s(ex))
	}
}
