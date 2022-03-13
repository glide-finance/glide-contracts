// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

// GlideToken with Governance.
contract StElaToken is ERC20('Staking Ela', 'stEla'), Ownable  {

    /// @notice Creates `_amount` token to `_to`. Must only be called by the owner (LiquidStaking).
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
    }
}