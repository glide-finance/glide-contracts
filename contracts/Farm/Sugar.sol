// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import "./GlideToken.sol";

// Sugar with Governance.
contract Sugar is ERC20('Sugar', 'SUGAR'), Ownable {
    /// @notice Creates `_amount` token to `_to`. Must only be called by the owner (MasterChef).
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    function burn(address _from ,uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
    }

    // The GLIDE TOKEN!
    GlideToken public glide;

    constructor(
        GlideToken _glide
    ) public {
        glide = _glide;
    }

    // Safe glide transfer function, just in case if rounding error causes pool to not have enough GLIDEs.
    function safeGlideTransfer(address _to, uint256 _amount) public onlyOwner {
        uint256 glideBal = glide.balanceOf(address(this));
        if (_amount > glideBal) {
            glide.transfer(_to, glideBal);
        } else {
            glide.transfer(_to, _amount);
        }
    }
}