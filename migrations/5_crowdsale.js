var CrowdsaleHandshake = artifacts.require('CrowdsaleHandshake');

module.exports = function (deployer, network, accounts) {
    deployer.deploy(CrowdsaleHandshake);
};
