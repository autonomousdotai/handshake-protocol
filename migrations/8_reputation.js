var Reputation = artifacts.require('Reputation');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Reputation);
};
