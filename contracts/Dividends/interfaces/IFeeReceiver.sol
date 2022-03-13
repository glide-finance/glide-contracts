// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

interface IFeeReceiver {
    function income(uint256 dollarAmount) external;
}