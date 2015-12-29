var Sequelize = require("sequelize");

module.exports = new Sequelize('wallet_server', 'root', '', {
    host: "localhost",
    port: 3306,
    dialect: 'mysql',
    // logging: (args)=>{ console.log(args) }
});
