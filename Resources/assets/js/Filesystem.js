define(function() {

    var Filesystem = {

        /**
         * Load a XML template file
         *
         * @param name
         * @returns {string}
         */
        getXmlTemplate: function(name) {
            var base = Ti.Filesystem.getResourcesDirectory(),
                file = Ti.Filesystem.getFile(base, 'xml', name + '.xml'),
                fs = Ti.Filesystem.getFileStream(file);

            //TODO add check if file exists

            fs.open(Ti.Filesystem.MODE_READ);
            var content = fs.read(file.size());
            fs.close();

            return content.toString();
        }
    };

    return Filesystem;
});