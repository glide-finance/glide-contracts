// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFeeReceiver {
    function income(uint256 dollarAmount) external;
}