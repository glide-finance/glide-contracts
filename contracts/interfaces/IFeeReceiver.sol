// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

interface IFeeReceiver {
    function income(uint256 dollarAmount) external;
}