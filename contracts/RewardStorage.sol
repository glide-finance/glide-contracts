// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardStorage is Ownable {
    using SafeERC20 for IERC20;

    // The GLIDE TOKEN!
    IERC20 public glide;

    constructor(
        IERC20 _glide
    ) public {
        glide = _glide;
    }

    // Safe glide transfer function, just in case if rounding error causes pool to not have enough GLIDEs.
    function safeGlideTransfer(address _to, uint256 _amount) external onlyOwner {
        uint256 glideBal = glide.balanceOf(address(this));
        if (_amount > glideBal) {
            glide.safeTransfer(_to, glideBal);
        } else {
            glide.safeTransfer(_to, _amount);
        }
    }
}