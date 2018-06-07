var ExchangeHandshake = artifacts.require('ExchangeHandshake');
var ExchangeShop = artifacts.require('ExchangeShop');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(ExchangeHandshake);
    deployer.deploy(ExchangeShop);

};
