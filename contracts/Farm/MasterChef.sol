// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./GlideToken.sol";
import "./Sugar.sol";

// MasterChef is the master of Glide. He can make Glide and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once GLIDE is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
contract MasterChef is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of GLIDEs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accGlidePerShare).sub(user.rewardDebt)
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accGlidePerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. GLIDEs to distribute per block.
        uint256 lastRewardBlock;  // Last block number that GLIDEs distribution occurs.
        uint256 accGlidePerShare; // Accumulated GLIDEs per share, times 1e18. See below.
        uint256 lpSupply;
    }

    // The GLIDE TOKEN!
    GlideToken public immutable glide;
    // GLIDE TOKEN transfer owner
    address public glideTransferOwner;

    // The SUGAR TOKEN!
    Sugar public immutable sugar;
    // Dev address.
    address public devaddr;
    // Treasury address
    address public immutable treasuryaddr;
    // GLIDE tokens created per block.
    uint256 public glidePerBlock;
    // GLIDE max rate (max perBlock setup)
    uint256 public constant MAX_EMISSION_RATE = 5 ether; // Safety check

    // Bounus reduction period
    uint256 public constant bonusPeriod = 1572480; //12 * 60 * 24 * 91 (91 is 3 months in days)
    // Reduction period
    uint256 public constant reductionPeriod = 3144960; //12 * 60 * 24 * 182 (182 is 6 months in days)

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // Max allocation points safety check
    uint256 public constant MAX_ALLOC_POINT = 100000;
    // The block number when GLIDE mining starts.
    uint256 public startBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event UpdateEmissionRate(address indexed user, uint256 glidePerBlock);
    event SetGlideTransferOwner(address indexed user, address indexed glideTransferOwner);
    event TransferGlideOwnership(address indexed user, address indexed newOwner);

    mapping(IERC20 => bool) public poolExistence;

    modifier nonDuplicated(IERC20 _lpToken) {
        require(poolExistence[_lpToken] == false, "MasterChef: nonDuplicated: duplicated");
        _;
    }

    constructor(
        GlideToken _glide,
        Sugar _sugar,
        address _devaddr,
        address _treasuryaddr,
        uint256 _glidePerBlock,
        uint256 _startBlock,
        address _glideTransferOwner
    ) public {
        glide = _glide;
        sugar = _sugar;
        devaddr = _devaddr;
        treasuryaddr = _treasuryaddr;
        glidePerBlock = _glidePerBlock;
        startBlock = _startBlock;
        glideTransferOwner = _glideTransferOwner;

        // staking pool
        poolInfo.push(PoolInfo({
            lpToken: _glide,
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accGlidePerShare: 0,
            lpSupply: 0
        }));

        totalAllocPoint = 1000;

    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // At what phase
    function phase(uint256 blockNumber) public view returns (uint256) {
        if (reductionPeriod == 0) {
            return 0;
        }
        if (blockNumber >= startBlock) {
            // calculate block number from start block
            uint256 blockNumberFromStart = blockNumber.sub(startBlock); 
            // if blockNumberFromStart less then block for reduction period, then we are in one phase
            if (blockNumberFromStart <= bonusPeriod) { 
                return 1;
            } else { 
                // calculate phase and add 1, because, will be start from one, and one phase is bonus phase 
                return (blockNumberFromStart.sub(bonusPeriod).sub(1)).div(reductionPeriod).add(2);
            }
        }
        return 0;
    }

    function phase() public view returns (uint256) {
        return phase(block.number);
    }

    // get Glide token reward per block
    function rewardPerPhase(uint256 phaseNumber) public view returns (uint256) {
        // if larger than 25, it would be overflow error (also, in first 25 phase we will distribute all tokens)
        if (phaseNumber == 0 || phaseNumber > 25) {
            return 0;
        } else if (phaseNumber == 1) {
            return glidePerBlock;
        } else {
            return glidePerBlock.mul(75).div(100).mul(85 ** (phaseNumber.sub(2))).div(100 ** (phaseNumber.sub(2)));
        }
    }

    function reward(uint256 blockNumber) public view returns (uint256) {
        uint256 _phase = phase(blockNumber);
        return rewardPerPhase(_phase);
    }

    function reward() public view returns (uint256) {
        return reward(block.number);
    }

    // Rewards total glide reward
    function getTotalGlideReward(uint256 _lastRewardBlock, uint256 _blockNumber) public view returns (uint256) {
        require(_lastRewardBlock <= _blockNumber, "MasterChef: must little than the current block number");
        require(_lastRewardBlock >= startBlock, "MasterChef: must be same or larger then startBlock");
        uint256 blockReward = 0;
        uint256 n = phase(_lastRewardBlock);
        uint256 m = phase(_blockNumber);
        // If it crosses the cycle
        while (n < m) {
            // Get the last block of the previous cycle
            uint256 r = (n.sub(1)).mul(reductionPeriod).add(startBlock).add(bonusPeriod);
            // Get rewards from previous periods
            blockReward = blockReward.add((r.sub(_lastRewardBlock)).mul(reward(r)));
            _lastRewardBlock = r;

            n++;
        }
        blockReward = blockReward.add((_blockNumber.sub(_lastRewardBlock)).mul(reward(_blockNumber)));
        return blockReward;
    }

    // Rewards for the current block
    function getGlideReward(uint256 _lastRewardBlock) public view returns (uint256) {
        return getTotalGlideReward(_lastRewardBlock, block.number);
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function add(uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate) public onlyOwner nonDuplicated(_lpToken){
        // Make sure the provided token is ERC20
        _lpToken.balanceOf(address(this));

        require(_allocPoint <= MAX_ALLOC_POINT, "MasterChef: !overmax");
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accGlidePerShare: 0,
            lpSupply: 0
        }));
        updateStakingPool();
    }

    // Update the given pool's GLIDE allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        require(_allocPoint <= MAX_ALLOC_POINT, "MasterChef: !overmax");
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 prevAllocPoint = poolInfo[_pid].allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        if (prevAllocPoint != _allocPoint) {
            totalAllocPoint = totalAllocPoint.sub(prevAllocPoint).add(_allocPoint);
            updateStakingPool();
        }
    }

    function updateStakingPool() internal {
        uint256 length = poolInfo.length;
        uint256 points = 0;
        for (uint256 pid = 1; pid < length; ++pid) {
            points = points.add(poolInfo[pid].allocPoint);
        }
        if (points != 0) {
            points = points.div(3);
            totalAllocPoint = totalAllocPoint.sub(poolInfo[0].allocPoint).add(points);
            poolInfo[0].allocPoint = points;
        }
    }

    // View function to see pending GLIDEs on frontend.
    function pendingGlide(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accGlidePerShare = pool.accGlidePerShare;
        if (block.number > pool.lastRewardBlock && pool.lpSupply != 0 && totalAllocPoint > 0) {
            uint256 glidePerBlockCalculated = getGlideReward(pool.lastRewardBlock);
            // add this check how this function not be fall on require on mint
            if (glide.totalSupply().add(glidePerBlockCalculated) < glide.getMaxTotalSupply()) {
                uint256 glideReward = glidePerBlockCalculated.mul(pool.allocPoint).div(totalAllocPoint);
                uint256 glideRewardSugar = glideReward.mul(650).div(1000); //65% go to sugar
                accGlidePerShare = accGlidePerShare.add(glideRewardSugar.mul(1e18).div(pool.lpSupply));
            }
        }
        return user.amount.mul(accGlidePerShare).div(1e18).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }


    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        
        if (pool.lpSupply == 0 || pool.allocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 glidePerBlockCalculated = getGlideReward(pool.lastRewardBlock);
        uint256 glideReward = glidePerBlockCalculated.mul(pool.allocPoint).div(totalAllocPoint);
        if (glide.totalSupply().add(glideReward) > glide.getMaxTotalSupply()) {
            glideReward = (glide.getMaxTotalSupply()).sub(glide.totalSupply());
        }
        // add this check how this function not be fall on require on mint
        if (glideReward != 0) {
            uint256 glideRewardSugar = glideReward.mul(650).div(1000); //65% go to sugar 
            uint256 glideRewardDev = glideReward.mul(125).div(1000); //12.5% go to dev addr
            uint256 glideRewardTreasury = glideReward.mul(225).div(1000); //22.5% go to treasury addr

            glide.mint(address(sugar), glideRewardSugar);
            glide.mint(devaddr, glideRewardDev); 
            glide.mint(treasuryaddr, glideRewardTreasury);
            
            pool.accGlidePerShare = pool.accGlidePerShare.add(glideRewardSugar.mul(1e18).div(pool.lpSupply));
            pool.lastRewardBlock = block.number;
        }
    }

    // Deposit LP tokens to MasterChef for GLIDE allocation.
    function deposit(uint256 _pid, uint256 _amount) public nonReentrant {
        require (_pid != 0, "MasterChef: deposit GLIDE by staking");

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accGlidePerShare).div(1e18).sub(user.rewardDebt);
            if(pending > 0) {
                safeGlideTransfer(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            uint256 balanceBefore = pool.lpToken.balanceOf(address(this));
            pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
            _amount = pool.lpToken.balanceOf(address(this)).sub(balanceBefore);
            require(_amount > 0, "MasterChef: we dont accept deposits of 0 size");

            user.amount = user.amount.add(_amount);
            pool.lpSupply = pool.lpSupply.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accGlidePerShare).div(1e18);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public nonReentrant {
        require (_pid != 0, "MasterChef: withdraw GLIDE by unstaking");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "MasterChef: withdraw: not good");

        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accGlidePerShare).div(1e18).sub(user.rewardDebt);
        if(pending > 0) {
            safeGlideTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpSupply = pool.lpSupply.sub(_amount);
            pool.lpToken.safeTransfer(msg.sender, _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accGlidePerShare).div(1e18);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Stake GLIDE tokens to MasterChef
    function enterStaking(uint256 _amount) public nonReentrant {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        updatePool(0);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accGlidePerShare).div(1e18).sub(user.rewardDebt);
            if(pending > 0) {
                safeGlideTransfer(msg.sender, pending);
            }
        }
        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
            user.amount = user.amount.add(_amount);
            pool.lpSupply = pool.lpSupply.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accGlidePerShare).div(1e18);

        sugar.mint(msg.sender, _amount);
        emit Deposit(msg.sender, 0, _amount);
    }

    // Withdraw GLIDE tokens from STAKING.
    function leaveStaking(uint256 _amount) public nonReentrant {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        require(user.amount >= _amount, "MasterChef: withdraw: not good");
        updatePool(0);
        uint256 pending = user.amount.mul(pool.accGlidePerShare).div(1e18).sub(user.rewardDebt);
        if(pending > 0) {
            safeGlideTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpSupply = pool.lpSupply.sub(_amount);
            pool.lpToken.safeTransfer(msg.sender, _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accGlidePerShare).div(1e18);

        sugar.burn(msg.sender, _amount);
        emit Withdraw(msg.sender, 0, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        if(_pid == 0) {
            sugar.burn(msg.sender, amount);
        }

        pool.lpToken.safeTransfer(msg.sender, amount);

        // In the case of an accounting error, we choose to let the user emergency withdraw anyway
        if (pool.lpSupply >= amount) {
            pool.lpSupply = pool.lpSupply.sub(amount);
        } else {
            pool.lpSupply = 0;
        }

        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // Safe glide transfer function, just in case if rounding error causes pool to not have enough GLIDEs.
    function safeGlideTransfer(address _to, uint256 _amount) internal {
        sugar.safeGlideTransfer(_to, _amount);
    }

    // Update dev address by the previous dev.
    function setDevAddress(address _devaddr) public {
        require(_devaddr != address(0), "MasterChef:!nonzero");
        require(msg.sender == devaddr, "MasterChef: sender is not same as dev addr");
        devaddr = _devaddr;
    }

    // Update start block
    function setStartBlock(uint256 _newStartBlock) external onlyOwner {
        require(block.number < startBlock, "MasterChef: cannot change start block if farm has already started");
        require(block.number < _newStartBlock, "MasterChef: cannot set start block in the past");
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            PoolInfo storage pool = poolInfo[pid];
            pool.lastRewardBlock = _newStartBlock;
        }
        startBlock = _newStartBlock;
    }

    // Should never fail as long as massUpdatePools is called during add
    function updateEmissionRate(uint256 _glidePerBlock) external onlyOwner {
        require(_glidePerBlock <= MAX_EMISSION_RATE, "MasterChef: !overmax");
        massUpdatePools();
        glidePerBlock = _glidePerBlock;
        emit UpdateEmissionRate(msg.sender, _glidePerBlock);
    }

    // Update Glide transfer owner. Can only be called by existing glideTransferOwner
    function setGlideTransferOwner(address _glideTransferOwner) external {
        require(msg.sender == glideTransferOwner, "MasterChef: sender is not glide transfer owner");
        glideTransferOwner = _glideTransferOwner;
        emit SetGlideTransferOwner(msg.sender, _glideTransferOwner);
    }

    /**
     * @dev DUE TO THIS CODE THIS CONTRACT MUST BE BEHIND A TIMELOCK (Ideally 7)
     * THIS FUNCTION EXISTS ONLY IF THERE IS AN ISSUE WITH THIS CONTRACT 
     * AND TOKEN MIGRATION MUST HAPPEN
     */
    function transferGlideOwnership(address _newOwner) external {
        require(msg.sender == glideTransferOwner, "MasterChef: sender is not glide transfer owner");
        glide.transferOwnership(_newOwner);
        emit TransferGlideOwnership(msg.sender, _newOwner);
    }
}