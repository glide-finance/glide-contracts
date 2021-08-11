// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardStorage is Ownable {
    using SafeERC20 for IERC20;

    // The OPERA TOKEN!
    IERC20 public opera;

    constructor(
        IERC20 _opera
    ) public {
        opera = _opera;
    }

    // Safe opera transfer function, just in case if rounding error causes pool to not have enough OPERAs.
    function safeOperaTransfer(address _to, uint256 _amount) external onlyOwner {
        uint256 operaBal = opera.balanceOf(address(this));
        if (_amount > operaBal) {
            opera.safeTransfer(_to, operaBal);
        } else {
            opera.safeTransfer(_to, _amount);
        }
    }
}