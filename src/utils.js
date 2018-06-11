module.exports = {
    normalizeId(id){
        let stringId = id+"";
        while(stringId.length < 4){
            stringId = "0" + stringId;
        }
        return stringId;
    },

    convertStringsToParams(strings){
        let params = [];
        for(let i in strings){
            let res = this.convertStringToParams(strings[i]);
            params.push({
                year: res[0],
                id: res[1]
            });
        }
        return params;
    },

    convertStringToParams(string){
        return string.match(/\d+/g);
    }
};