var ExchangeHandshake = artifacts.require('ExchangeHandshake');
var ExchangeCash = artifacts.require('ExchangeCash');
var CreditATM = artifacts.require('CreditATM');


module.exports = function (deployer, network, accounts) {
    deployer.deploy(ExchangeHandshake);
    deployer.deploy(ExchangeCash);
    deployer.deploy(CreditATM);

};
