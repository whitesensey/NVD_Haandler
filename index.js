const http            = require('http');
const bodyParser      = require('body-parser');
const Router          = require('router');
const vulnerability   = require('./src/models/vulnerability');
const cron = require('node-cron');
const utils = require('./src/utils');
const Synchronizer = require('./src/synchronizer');

const router = Router();

router.use(bodyParser.json());

router.post('/', function (req, res) {
    res.setHeader("Content-Type",'application/json');
    let request = req.body;
    let params = utils.convertStringsToParams(request.ids);
    vulnerability.getVulnerabilitiesByCVE(params)
        .then(function(data){
            res.statusCode = 200;
            if(data.hasOwnProperty('error'))
                res.statusCode = 500;
            res.end(JSON.stringify(data));
        });
});

const DBClient = require("./src/config/dbclient");
const server = http.createServer(function (req, res) {
    router(req, res, function(){});
});
const cronTask = cron.schedule('*/2 * * * *', async function(){
    Synchronizer.updateDataFromNVD();
}, false);

let dbPromise = DBClient.initConnection();
let db;

Promise.all([dbPromise, server]).then((results) => {
    if(results[0]){
        console.log("Database connection established.");
        db = results[0];
    } else {
        console.log("Database connection crashed.");
    }
    if(results[0] && results[1]) {
        Synchronizer.baseInsertYearData().then(()=>{
            console.log("Base data inserted");
            server.listen(3000);
            console.log("NVD service started successfully.");
            cronTask.start();
        });
    } else {
        console.log("NVD service failed to start.");
    }
});

process.on('SIGINT', async function() {
    if(cronTask)
        cronTask.destroy();
    if(db)
        db.end();
    process.exit(0);
});