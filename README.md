# rkv

global distributed kv with [rethinkdb](https://rethinkdb.com/), in one line command

# usage

```
# docker mode

RKVPASS=egrkvpass \
CANONICAL=egrkv.partnernetsoftware.com \
RKVCLUSTER=egrkv.partnernetsoftware.com \
sh docker_rkv_work.sh \
sh rkv_work.sh

# native mode

RKVPASS=egrkvpass \
CANONICAL=egrkv.partnernetsoftware.com \
RKVCLUSTER=egrkv.partnernetsoftware.com \
sh rkv_work.sh

```

# NOTES

if you wanna run it in private network, zerotier might be your great choice.

