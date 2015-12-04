var Sequelize = require("sequelize");
var connection = require("./connection");

var Wallet = connection.define('wallets', {
    email: { type: Sequelize.STRING, allowNull: false, unique: true },
    public_key: { type: Sequelize.STRING, allowNull: false, unique: true },
    encrypted_data: { type: Sequelize.BLOB, allowNull: false },
    signature: { type: Sequelize.STRING, allowNull: false },
    local_hash: { type: Sequelize.STRING, allowNull: false }
});

// recreate dabase when running locally, example: node src/db/models.js
if (require.main === module) {
    console.log("Updating database, this may take a minute...");
    console.log();
    Wallet.sync({force: true}).then(function (res) {
        console.log("-- table wallets created -->", res);
    });
}

module.exports.Wallet = Wallet;
