var PredictionHandshakeWithToken = artifacts.require('PredictionHandshakeWithToken');
var TokenRegistry = artifacts.require('TokenRegistry');

module.exports = function (deployer, network, accounts) {
    deployer.then(() => {
        return TokenRegistry.new();
    }).then((tokenRegistry) => {
        return PredictionHandshakeWithToken.new(tokenRegistry.address);
    })
};
