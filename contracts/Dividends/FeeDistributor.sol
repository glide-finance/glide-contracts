// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import '../Swap/libraries/RouterHelper.sol';

import "./interfaces/IFeeReceiver.sol";

contract FeeDistributor is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public platformShareBP;

    address public rewardsReceiver;
    address public feeHolder;

    address public schedulerAddress;

    address public wElaAddress;

    event RescueTokens(address indexed user, address indexed token, uint256 amount);
    event UpdateFeeSettings(address indexed user, uint platformShareBP);
    event UpdateFeeReceivers(address indexed user, address rewardsReceiver, address feeHolder);
    event SetSchedulerAddress(address indexed user, address newAddr);

    constructor(
        address _rewardsReceiver,
        address _feeHolder,
        address _schedulerAddress,
        address _wElaAddress
    ) public {
        rewardsReceiver = _rewardsReceiver;
        feeHolder = _feeHolder;
        schedulerAddress = _schedulerAddress;
        wElaAddress = _wElaAddress;
    }

    modifier onlyAdmins(){
        require(msg.sender == schedulerAddress || msg.sender == owner(), "onlyAdmins: FORBIDDEN");
        _;
    }

    function removeLiquidity(address router, address lpToken) external onlyAdmins {
        uint256 amount = IERC20(lpToken).balanceOf(address(this));
        RouterHelper.removeLiquidity(router, lpToken, amount);
    }

    function sellTokens(address router, address inputToken, address outputToken, address[] memory path) external onlyAdmins {
        uint256 amount = IERC20(inputToken).balanceOf(address(this));
        RouterHelper.swapTokens(router, amount, inputToken, outputToken, path);
    }

    function distributeFees() external onlyAdmins {

        uint256 balance = IERC20(wElaAddress).balanceOf(address(this));

        uint256 platformAmount = balance.mul(platformShareBP).div(10000);
        uint256 receiverAmount = balance.sub(platformAmount);

        IERC20(wElaAddress).safeIncreaseAllowance(rewardsReceiver, receiverAmount);
        IFeeReceiver(rewardsReceiver).income(receiverAmount);

        safeTokenTransfer(feeHolder, platformAmount);
    }

    function safeTokenTransfer(address to, uint256 amount) internal {
        uint256 balance = IERC20(wElaAddress).balanceOf(address(this));
        if (amount > balance) {
            IERC20(wElaAddress).safeTransfer(to, balance);
        } else {
            IERC20(wElaAddress).safeTransfer(to, amount);
        }
    }

    function rescueToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(feeHolder, balance);
        emit RescueTokens(msg.sender, token, balance);
    }

    function updateFeeSettings(uint256 _platformShareBP) external onlyOwner {
        platformShareBP = _platformShareBP;
        emit UpdateFeeSettings(msg.sender, platformShareBP);
    }

    function updateFeeReceivers(address _rewardsReceiver, address _feeHolder) external onlyOwner {
        rewardsReceiver = _rewardsReceiver;
        feeHolder = _feeHolder;
        emit UpdateFeeReceivers(msg.sender, rewardsReceiver, feeHolder);
    }

    function setSchedulerAddr(address newAddr) external onlyAdmins {
        schedulerAddress = newAddr;
        emit SetSchedulerAddress(msg.sender, newAddr);
    }
}