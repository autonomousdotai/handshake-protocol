pragma solidity ^0.4.18;

/**
 * @title BasicHandshake
 * @author Autonomous
 * @dev BasicHandshake allows n entities making aggrement on anything they want
 */
contract GroupHandshake {
    struct Handshake {
        address initiator;
        mapping(bytes32 => AcceptorState) validator;
        uint numberOfShakers;
        S state;
    }

    enum S { Inited, Shaked, Done }
    enum AcceptorState { None, Shaked }

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
        Handshake memory hs;
        hs.initiator = msg.sender;
        hs.numberOfShakers = acceptors.length;
        hs.state = S.Inited;

        handshakes.push(hs);

        addValidator(handshakes.length - 1, acceptors);
        __init(handshakes.length - 1, offchain);
    }

    /**
    * Accept the handshake
    * @param hid Id of the handshake to accept
    * @param offchain record ID in offchain backend database
    */
    function shake(uint hid, bytes32 acceptor, bytes32 offchain) public {
        Handshake storage hs = handshakes[hid];
        require(hs.state != S.Done && hs.validator[acceptor] != AcceptorState.Shaked);

        hs.validator[acceptor] = AcceptorState.Shaked;

        if (hs.numberOfShakers != 0) {
            hs.numberOfShakers -= 1;
        }

        if (hs.numberOfShakers == 0) {
            hs.state = S.Done;
        } else {
            hs.state = S.Shaked;
        }
        __shake(hid, hs.state, offchain);
    }

    function addValidator(uint hid, bytes32[] acceptors) private {
        Handshake storage hs = handshakes[hid];
        for (uint index = 0; index < acceptors.length; index++) {
            hs.validator[acceptors[index]] = AcceptorState.None;
        }
    }
}
