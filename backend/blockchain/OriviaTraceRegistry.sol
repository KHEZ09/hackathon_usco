// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ORIVIA traceability registry
/// @notice Stores only hashes and non-sensitive identifiers. Business data stays
/// in PostgreSQL; this contract provides a public, independently verifiable
/// timestamp and existence proof for each traceability event.
contract OriviaTraceRegistry {
    struct Anchor {
        uint64 anchoredAt;
        address submitter;
    }

    mapping(bytes32 => Anchor) private anchors;

    event EventAnchored(
        bytes32 indexed eventHash,
        bytes32 indexed subjectHash,
        bytes32 indexed eventTypeHash,
        uint64 occurredAt,
        address submitter
    );

    function anchor(
        bytes32 eventHash,
        bytes32 subjectHash,
        bytes32 eventTypeHash,
        uint64 occurredAt
    ) external returns (bool created) {
        require(eventHash != bytes32(0), "event hash required");
        if (anchors[eventHash].anchoredAt != 0) {
            return false;
        }

        anchors[eventHash] = Anchor(uint64(block.timestamp), msg.sender);
        emit EventAnchored(
            eventHash,
            subjectHash,
            eventTypeHash,
            occurredAt,
            msg.sender
        );
        return true;
    }

    function isAnchored(bytes32 eventHash) external view returns (bool) {
        return anchors[eventHash].anchoredAt != 0;
    }

    function anchoredAt(bytes32 eventHash) external view returns (uint64) {
        return anchors[eventHash].anchoredAt;
    }

    function submitter(bytes32 eventHash) external view returns (address) {
        return anchors[eventHash].submitter;
    }
}
