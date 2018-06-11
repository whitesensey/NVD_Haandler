const fs = require('fs');
const AdmZip = require('adm-zip');
const https = require('https');
const utils = require('./utils');
const vulnerability   = require('./models/vulnerability');

class Synchronizer {

    constructor(){
        this.lastModified = new Date(0);
        this.pageURL = "https://nvd.nist.gov/vuln/data-feeds";
        this.yearRegExp = /nvdcve-1.0-[0-9]*\.json\.zip/g;
        this.feedsBaseURL = "https://nvd.nist.gov/feeds/json/cve/1.0/";
        this.fsBasePath = "./files/";
        this.modifiedFeedName = "nvdcve-1.0-modified.json.zip";
        this.modifiedMetaName = "nvdcve-1.0-modified.meta";
    }

    async updateDataFromNVD(){
        let feedModifiedDate = await this.getModifiedMeta();
        if(feedModifiedDate > this.lastModified){
            console.log("Update started");
            await this.loadAndStoreZip(this.modifiedFeedName);
            let jsons = this.getFilesDataAsArray([this.modifiedFeedName]);
            await this.updateDataToDatabase(jsons);
            this.lastModified = feedModifiedDate;
        }
    }

    async getModifiedMeta() {
        let anchor = 'lastModifiedDate:';
        let modified = await this.request(this.feedsBaseURL + this.modifiedMetaName);
        modified = modified.split("\r\n");
        let modifiedDate = null;
        for(let i in modified){
            let offset = modified[i].indexOf(anchor);
            if(offset > -1){
                modifiedDate = modified[i].substr(anchor.length, 19);
            }
        }
        return new Date(modifiedDate);
    }

    async baseInsertYearData(){
        let fileNames = await this.loadYearFeeds();
        await vulnerability.cleanTable();
        let jsons = this.getFilesDataAsArray(fileNames);
        await this.insertDataToDatabase(jsons);
        return 0;
    }

    getFilesDataAsArray(fileNames){
        let jsons = [];
        console.log("Reading files...");
        for(let i in fileNames){
            let filename = fileNames[i];
            let zip = new AdmZip(this.fsBasePath + filename);
            let zipEntry = zip.getEntries()[0];
            let data = JSON.parse(zipEntry.getData().toString());
            jsons.push(...data["CVE_Items"]);
        }
        console.log("Files are read");
        return jsons;
    }

    async updateDataToDatabase(data){
        console.log("Updating");
        let promises = [];
        let errors = [];
        for(let i in data){
            let record = data[i];
            let idString = record["cve"]["CVE_data_meta"]["ID"];
            let param = utils.convertStringToParams(idString);
            let promise = vulnerability.createOrUpdate(param[0], param[1], record);
            promises.push(promise);
        }
        let returnPromise = Promise.all(promises);
        returnPromise.then(()=> {
            console.log("Updating ended");
        }).catch(()=>{
            console.error(errors);
        });
        return returnPromise;
    }

    async insertDataToDatabase(data){
        console.log("Inserting");
        let promises = [];
        let errors = [];
        for(let i in data){
            let record = data[i];
            let idString = record["cve"]["CVE_data_meta"]["ID"];
            let param = utils.convertStringToParams(idString);
            let promise = vulnerability.create(param[0], param[1], record);
            promises.push(promise);
        }
        let returnPromise = Promise.all(promises);
        returnPromise.then(()=> {
            console.log("Inserting ended");
        }).catch(()=>{
            console.error(errors);
        });
        return returnPromise;
    }

    async loadYearFeeds(){
        console.log("Loading zips started");
        let html = await this.request(this.pageURL);
        let names = html.match(this.yearRegExp);
        let promises = [];
        for(let i in names){
            promises.push(this.loadAndStoreZip(names[i]));
        }
        await Promise.all(promises);
        console.log("Zips downloaded");
        return names;
    }

    request(url) {
        return new Promise(function (resolve, reject) {
            https.get(url, (resp) => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => {
                    resolve(data)
                });
            }).on("error", (err) => {
                console.log("Error: " + err.message);
                reject([]);
            });
        });
    }

    loadAndStoreZip(name) {
        let that = this;
        return new Promise( function (resolve, reject) {
            let fd = fs.openSync(that.fsBasePath + name, 'w');
            https.get(that.feedsBaseURL + name, (resp) => {
                resp.on('data', (chunk) => {
                    fs.write(fd, chunk, 0, chunk.length, null, function (err) {
                        if (err) throw 'error writing file: ' + err;
                    });
                });
                resp.on('end', () => {
                    fs.close(fd, function () {
                        console.log("wrote the file " + name + " successfully");
                        resolve();
                    });
                });
            }).on("error", (err) => {
                console.log("Error: " + err.message);
                reject();
            });
        });
    }
}

module.exports = new Synchronizer();