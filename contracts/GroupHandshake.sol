pragma solidity ^0.4.18;

/**
 * @title BasicHandshake
 * @author Autonomous
 * @dev BasicHandshake allows n entities making aggrement on anything they want
 */
contract GroupHandshake {
    struct Handshake {
        address initiator;
        bytes32[] acceptors;
        mapping(bytes32 => uint8) validator;
        uint numberOfShakers;
        S state;
    }

    enum S { Inited, Shaked, Done }
    Handshake[] public handshakes;

    event __init(uint hid, bytes32 offchain);
    event __shake(uint hid, S state, bytes32 offchain);

    /**
    * Initiate a handshake between 1-n entities
    * @param acceptors id of the ones to receive handshake;
    *   might be 0 if acceptor is not known before creating handshake
    * @param offchain record ID in offchain backend database
    */
    function init(bytes32[] acceptors, bytes32 offchain) public {
        handshakes.push(Handshake(msg.sender, acceptors, 0, S.Inited));
        __init(handshakes.length - 1, offchain);
    }

    /**
    * Accept the handshake
    * @param hid Id of the handshake to accept
    * @param offchain record ID in offchain backend database
    */
    function shake(uint hid, bytes32 acceptor, bytes32 offchain) public {
        Handshake storage hs = handshakes[hid];
        require(hs.state != S.Done);

        // Set acceptor if it was not defined in init stage
        if (hs.acceptors.length == 0) {
            hs.acceptors.push(acceptor);
        } else {
            require(isValidAcceptor(hid, acceptor) == true && hs.validator[acceptor] == 0);
        }
        hs.validator[acceptor] = 1;
        hs.numberOfShakers += 1;
        if (hs.numberOfShakers == hs.acceptors.length) {
            hs.state = S.Done;
        } else {
            hs.state = S.Shaked;
        }

        __shake(hid, hs.state, offchain);
    }

    function isValidAcceptor(uint hid, bytes32 acceptor) private view returns (bool value) {
        Handshake storage hs = handshakes[hid];
        for (uint index = 0; index < hs.acceptors.length; index++) {
            if (hs.acceptors[index] == acceptor) {
                value = true;
                return;
            }
        }
    }

    function handshakeOf(uint hid) public view returns (uint, uint, uint8) {
        Handshake storage hs = handshakes[hid];
        return (hs.numberOfShakers, hs.acceptors.length, uint8(hs.state));
    }
}
