docker run -ti -p 28015:28015 -p 29015:29015 -p 8888:8080 -e RKVPASS -e RKVCLUSTER -e CANONICAL -v $PWD:/work/ -w /work/ rethinkdb $*
