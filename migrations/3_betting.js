var BettingHandshake = artifacts.require('BettingHandshake');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(BettingHandshake);
};
