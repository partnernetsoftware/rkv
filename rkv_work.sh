rethinkdb --initial-password "$RKVPASS" -d ./rdbdata/ --bind all --join "$RKVCLUSTER" --no-http-admin --canonical-address "$CANONICAL" $*
