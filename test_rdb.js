//e.g. node test_rdb /password=???
//(async()=>{
		var argv2o = a => (a || require('process').argv || []).reduce((r, e) => ((m = e.match(/^(\/|--?)([\w-]*)="?(.*)"?$/)) && (r[m[2]] = m[3]), r), {}), argo = argv2o();
	var r = require('rethinkdb');
	r.connect(/*{
		//host:'127.0.0.1',
		//port:28015,
		//db: 'rethinkdb',
		//user:'admin',
		//password:'',
		timeout:2,
	}*/ argo, async(err, conn)=>{
		if(err) console.log({err,conn})
		if(conn){
			//@ref https://rethinkdb.com/api/javascript/
			//r.db('rethinkdb').table('server_status').run(conn,(err,cursor)=>cursor.toArray(console.log))
			var cursor = await r.db('rethinkdb').table('server_status').run(conn);
			console.log(JSON.stringify(await cursor.toArray()));
		}
	});
//})();
