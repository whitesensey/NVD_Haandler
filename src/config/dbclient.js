const pg = require('pg');
const config = require('./config');

class DBClient {

    constructor(){
        this.pool = null;
    }

    initConnection(){
        this.pool = new pg.Pool({
            user: config.DATABASE_CONNECTION.user,
            host: config.DATABASE_CONNECTION.host,
            database: config.DATABASE_CONNECTION.database,
            password: config.DATABASE_CONNECTION.password,
            port: config.DATABASE_CONNECTION.port
        });
        this.checkDatabasesExistence();
        return this.pool;
    }

    getConnection(){
        return this.pool.connect();
    }

    closeConnection(connection){
        connection.release();
    }

    checkDatabasesExistence(){
        this.pool.query("CREATE TABLE IF NOT EXISTS vulnerability(" +
            "id integer not null," +
            "year integer not null," +
            "content jsonb," +
            "PRIMARY KEY (id, year))");
    }
}

module.exports = new DBClient();