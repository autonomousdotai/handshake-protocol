var ExchangeHandshake = artifacts.require('ExchangeHandshake');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(ExchangeHandshake);
};
