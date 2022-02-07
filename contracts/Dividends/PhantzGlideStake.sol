// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PhantzGlideStake is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 public lastUpdatedBlock;

    mapping(address => uint256) public glideRewards;

    IERC20 public immutable token; // Glide token

    event AddReward(address indexed user, uint256 block, uint256 amount);
    event WithdrawReward(address indexed user, uint256 block, uint256 amount);
    event RescueTokens(address indexed user, address indexed token, uint256 amount);

    constructor(
        IERC20 _token,
        uint256 _startBlock
    ) public {
        token = _token;
        lastUpdatedBlock = _startBlock;
    }

    function setLastUpdateBlock(uint256 _lastUpdatedBlock) external onlyOwner {
        lastUpdatedBlock = _lastUpdatedBlock;
    }

    function addGlideReward(address _user, uint256 _amount) external onlyOwner {
        glideRewards[_user] = glideRewards[_user].add(_amount);

        token.safeTransferFrom(msg.sender, address(this), _amount);

        emit AddReward(_user, block.number, _amount);
    }

    function addGlideReward(address[] memory _users, uint256[] memory _amounts) external onlyOwner {
        require(_users.length == _amounts.length, "Arrays are not equal");

        for(uint256 i = 0; i < _users.length; i++) {
            glideRewards[_users[i]] = glideRewards[_users[i]].add(_amounts[i]);

            token.safeTransferFrom(msg.sender, address(this), _amounts[i]);

            emit AddReward(_users[i], block.number, _amounts[i]);
        }
    }

    function withdrawGlideReward() external nonReentrant {
        if (glideRewards[msg.sender] > 0) {
            uint256 amount = glideRewards[msg.sender];

            glideRewards[msg.sender] = 0;
            
            token.safeTransfer(msg.sender, amount);
            
            emit WithdrawReward(msg.sender, block.number, amount);
        }
    }

    function rescueToken(address rewardToken, address addressForReceive) external onlyOwner {
        uint256 balance = IERC20(rewardToken).balanceOf(address(this));
        IERC20(token).safeTransfer(addressForReceive, balance);
        emit RescueTokens(msg.sender, rewardToken, balance);
    }
}