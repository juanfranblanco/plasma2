var path = require("path");

module.exports = {
    target: "node",
    output: {
        filename: "out/bundle.js"
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel",
                query: {
                    // https://github.com/babel/babel-loader#options
                    cacheDirectory: true,
                    presets: ['es2015']
                }
            },
            { test: /\.json/, loader: "json-loader" },
        ]
    },
    resolve: {
        root: ["libraries", "programs"],
        extensions: ["", ".js",".json"],
    },
    resolveLoader: {
        fallback: [path.resolve(__dirname, "./node_modules")]
    },
    plugins: [
    //     new webpack.IgnorePlugin(/\.(css|less)$/),
    //     new webpack.BannerPlugin("require('source-map-support').install();", { raw: true, entryOnly: false })
    ],
    devtool: "sourcemap"
}
