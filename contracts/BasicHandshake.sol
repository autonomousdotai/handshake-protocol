pragma solidity ^0.4.18;

/**
 * @title BasicHandshake
 * @author Autonomous
 * @dev BasicHandshake allows two entities making aggrement on anything they want
 */
contract BasicHandshake {

    struct Handshake {
        address initiator;
        address acceptor;
    }

    Handshake[] public handshakes;

    event __init(uint hid, bytes32 offchain);
    event __shake(uint hid, bytes32 offchain);

    /**
    * Initiate a handshake between 2 entities
    * @param acceptor address of the one to receive handshake;
    *   might be 0 if acceptor is not known before creating handshake
    * @param offchain record ID in offchain backend database
    */
    function init(address acceptor, bytes32 offchain) public {
        handshakes.push(Handshake(msg.sender, acceptor));
        __init(handshakes.length - 1, offchain);
    }

    /**
    * Accept the handshake
    * @param hid Id of the handshake to accept
    * @param offchain record ID in offchain backend database
    */
    function shake(uint hid, bytes32 offchain) public {
        // Set acceptor if it was not defined in init stage
        if (handshakes[hid].acceptor == 0) {
            handshakes[hid].acceptor = msg.sender;
        } else {
            require(handshakes[hid].acceptor == msg.sender);
        }
        __shake(hid, offchain);
    }
}
