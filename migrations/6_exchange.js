var ExchangeHandshake = artifacts.require('ExchangeHandshake');
var ExchangeCash = artifacts.require('ExchangeCash');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(ExchangeHandshake);
    deployer.deploy(ExchangeCash);

};
