// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./StElaToken.sol";

contract LiquidStaking is Ownable {

    StElaToken private stEla;

    uint256 public bufferedEla;
    uint256 public exchangeRate;
    uint256 public currentEpoch;
    uint256 public totalWithdrawRequested;

    struct WithrawRequest {
        uint256 elaAmount;
        uint256 epoch;
    }
    
    mapping(address=>WithrawRequest) withdrawRequests;
    mapping(address=>uint256) withdrawAmounts;

    constructor(
        StElaToken _stEla
    ) {
        stEla = _stEla;
        exchangeRate = 1;
        currentEpoch = 1;
    }

    function updateEpoch(
        uint256 _exchangeRate
    ) external payable onlyOwner {
        require(totalWithdrawRequested == msg.value);
        exchangeRate = _exchangeRate;
        currentEpoch += 1;
        totalWithdrawRequested = 0;
    }

    function deposit(address _stElaReceiver) external payable {
        bufferedEla += msg.value;
        uint256 amountOut = msg.value * exchangeRate;
        stEla.mint(_stElaReceiver, amountOut);
    }

    function requestWithdraw(uint256 _amount) external {
        require(_amount <= stEla.balanceOf(msg.sender), "LiquidStaking: requestWithdraw");
        stEla.burn(msg.sender, _amount);

        if (withdrawRequests[msg.sender].elaAmount > 0 
            && withdrawRequests[msg.sender].epoch < currentEpoch
        ) {
            withdrawAmounts[msg.sender] += withdrawRequests[msg.sender].elaAmount;
            withdrawRequests[msg.sender].elaAmount = 0;
        }
        
        uint256 receiveElaAmount = _amount / exchangeRate;
        totalWithdrawRequested += receiveElaAmount;
        withdrawRequests[msg.sender].elaAmount += receiveElaAmount;
        withdrawRequests[msg.sender].epoch = currentEpoch;
    }

    function withdraw(
        uint256 _amount,
        address _receiver
    ) external {
        if (withdrawRequests[msg.sender].epoch < currentEpoch) {
            withdrawAmounts[msg.sender] += withdrawRequests[msg.sender].elaAmount;
            withdrawRequests[msg.sender].elaAmount = 0;
        }
        
        require(_amount <= withdrawAmounts[msg.sender], "LiquidStaking: withdraw");
        withdrawAmounts[msg.sender] -= _amount;
        (bool successTransfer, ) = payable(_receiver).call{value: _amount}("");
        require(successTransfer, "LiquidStaking: Transfer is not success");
    }
}