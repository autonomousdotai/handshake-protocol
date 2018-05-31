var PredictionHandshake = artifacts.require('PredictionHandshake');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(PredictionHandshake);
};
