const {ethers} = require("ethers");

const BN = require('bn.js');

const GlideVault = artifacts.require("GlideVault");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const GlideToken = artifacts.require("GlideToken");
const GlideRouter = artifacts.require("GlideRouter");
const GlideFactory = artifacts.require("GlideFactory");
const GlidePair = artifacts.require("GlidePair");
const IERC20 = artifacts.require("IERC20");
const SwapRewardsChef = artifacts.require("SwapRewardsChef");
const MasterChef = artifacts.require("MasterChef");

contract("GlideVault test", accounts => {
    var glideVaultInstance;
    var testTokenOneInstance;
    var testTokenTwoInstance;
    var glideTokenInstance;
    var wETHInstance;
    var glideRouterInstance;
    var swapRewardsChefInstance;
    var masterChefInstance;

    //set contract instances
    before(async () => {
        glideFactoryInstance = await GlideFactory.deployed();
        assert.ok(glideFactoryInstance);

        glideVaultInstance = await GlideVault.deployed();
        assert.ok(glideVaultInstance);

        testTokenOneInstance = await TestTokenOne.deployed();
        assert.ok(testTokenOneInstance);

        testTokenTwoInstance = await TestTokenTwo.deployed();
        assert.ok(testTokenTwoInstance);

        glideTokenInstance = await GlideToken.deployed();
        assert.ok(glideTokenInstance);

        glideRouterInstance = await GlideRouter.deployed();
        assert.ok(glideRouterInstance);

        swapRewardsChefInstance = await SwapRewardsChef.deployed();
        assert.ok(swapRewardsChefInstance);

        masterChefInstance = await MasterChef.deployed();
        assert.ok(masterChefInstance);
        
        wETHAddress = await glideRouterInstance.WETH();
        wETHInstance = await IERC20.at(wETHAddress);

        // create pair
        await glideFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);
        
        // get pair address from factory
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, testTokenTwoInstance.address);

        // add pair to masterChef contract
        await masterChefInstance.add(1000, pairAddress, true);

        await GlidePair.deployed();
    });

    it("...should transfer ownership for Glide token and mint tokens", async () => {
        await masterChefInstance.transferGlideOwnership(accounts[0]);

        const ownerAfterTransfer = await glideTokenInstance.owner();
        assert.equal(ownerAfterTransfer, accounts[0], "Transfer ownership for Glide token is not good");

        // transfer glideToken to account[3] for deposit 
        const tokensForMint = ethers.utils.parseEther('50');
        await glideTokenInstance.mint(accounts[3], tokensForMint);
        const balanceGlideToken = await glideTokenInstance.balanceOf.call(accounts[3]);
        assert.equal(tokensForMint.toString(), new BN(balanceGlideToken.toString()).toString(), "Mint for Glide token is not correct");

        // set token ownership to masterChef
        const masterChefAddress = masterChefInstance.address;
        glideTokenInstance.transferOwnership(masterChefAddress);
    });

    it("...should deposit to GlideVault", async() => {
        // set amount for deposit
        const depositAmount = ethers.utils.parseEther('1');

        // approve to glideVault instance for depositAmount
        await glideTokenInstance.approve(glideVaultInstance.address, depositAmount, {from: accounts[3]});

        // should deposit to glide vault
        await glideVaultInstance.deposit(depositAmount, {from: accounts[3]});

        // check balance
        const glideBalanceMasterChef = await glideTokenInstance.balanceOf.call(masterChefInstance.address);
        //console.log("glideBalanceMasterChef-" + glideBalanceMasterChef.toString());

        assert.equal(depositAmount.toString(), glideBalanceMasterChef.toString(), "deposit is not correct set");

        // check info about stake on masterChef
        const stakeOnUserPool = await masterChefInstance.userInfo.call(0, glideVaultInstance.address);
        assert.equal(depositAmount.toString(), stakeOnUserPool.amount.toString(), "stake on user pool is not correct set");
    });

    it("...should harvest from GlideVault", async() => {
        // get glide amount before harvest for accounts[4]
        const glideAmountAccounts4Before = await glideTokenInstance.balanceOf.call(accounts[4]);
        // get treasury address from glideVault
        const treasuryAddr = await glideVaultInstance.treasury.call();
        // get glide amount for treasury address
        const glideAmountTreasuryBefore = await glideTokenInstance.balanceOf.call(treasuryAddr);

        // get totalAllocPoint
        const totalAllocPoint = await masterChefInstance.totalAllocPoint.call();
        //console.log("totalAllocPoint-" + totalAllocPoint);
        // get poolInfo about 0 index
        const poolInfoIndexZero = await masterChefInstance.poolInfo.call(0);
        //console.log("poolInfoIndexZero.allocPoint-" + poolInfoIndexZero.allocPoint);
        // get glide per block reward
        const glidePerBlock = await masterChefInstance.glidePerBlock.call();
        // calculate glide per pool (pool[0])
        const glideRewardPerPool =  glidePerBlock.mul(new BN(poolInfoIndexZero.allocPoint)).div(totalAllocPoint);
        // calculate stake reward - 65% go to stake
        const stakeGlideReward = new BN(glideRewardPerPool.toString()).mul(new BN(650)).div(new BN(1000));
        //console.log("stakeGlideReward-"+stakeGlideReward);
        // get lpSupply
        const lpSupply = await glideTokenInstance.balanceOf.call(masterChefInstance.address);
        //console.log("lpSupply-"+lpSupply);
        // calculate accGlidePerShare
        //console.log("poolInfoIndexZero.accGlidePerShare-"+poolInfoIndexZero.accGlidePerShare);
        const accGlidePerShare = poolInfoIndexZero.accGlidePerShare.add(stakeGlideReward.mul(new BN("1000000000000000000")).div(lpSupply));
        //console.log("accGlidePerShare-"+accGlidePerShare);
        const glideVaultUserInfo = await masterChefInstance.userInfo.call(0, glideVaultInstance.address);
        // calcaute reward
        const rewardForGlideVault = glideVaultUserInfo.amount.mul(accGlidePerShare).div(new BN("1000000000000000000"));
        //console.log("rewardForGlideVault-"+rewardForGlideVault);

        // calculate harvest reward (call fee)
        const harvestCallFee = await glideVaultInstance.callFee.call();
        const glideCallFee = rewardForGlideVault.mul(new BN(harvestCallFee.toString())).div(new BN(10000));
        //console.log("glideCallFee-"+glideCallFee);

        // should execute harvest
        await glideVaultInstance.harvest({from: accounts[4]});

        // get glide amount after harvest for accounts[4]
        const glideAmountAccounts4After = await glideTokenInstance.balanceOf.call(accounts[4]);

        // check amount for call fee after harvest
        assert.equal(new BN(glideAmountAccounts4After.toString()).sub(new BN(glideAmountAccounts4Before.toString())).toString(), glideCallFee.toString(), "callFee is not same, harvest is not good");

        // calculate performance fee (for treasury)
        const harvestPerformanceFee = await glideVaultInstance.performanceFee.call();
        const glidePerformanceFee = rewardForGlideVault.mul(new BN(harvestPerformanceFee.toString())).div(new BN(10000));

        // get glide amount for treasury address after harvest
        const glideAmountTreasuryAfter = await glideTokenInstance.balanceOf.call(treasuryAddr);

        // check amount for call fee after harvest
        assert.equal(new BN(glideAmountTreasuryAfter.toString()).sub(new BN(glideAmountTreasuryBefore.toString())).toString(), glidePerformanceFee.toString(), "performanceFee is not same, harvest is not good");
    });

    it("...should withdraw from GlideVault", async() => {
        // set amount for withdraw
        const withdrawShare = ethers.utils.parseEther('0.7');

        // check balance before withdraw
        const glideBalanceAccounts3Before = await glideTokenInstance.balanceOf.call(accounts[3]);
        //console.log("glideBalanceAccounts3Before-" + glideBalanceAccounts3Before.toString());

        // get details for calcuation from glideVault contract
        //const userInfo = await glideVaultInstance.userInfo.call(accounts[3]);
        //console.log("userInfo.shares-"+userInfo.shares);
        //console.log("userInfo.glideAtLastUserAction-"+userInfo.glideAtLastUserAction);
        const balanceOf = await glideVaultInstance.balanceOf();
        //console.log("balanceOf-"+balanceOf.toString());
        const totalShares = await glideVaultInstance.totalShares.call();
        //console.log("totalShares-"+totalShares.toString());
        const withdrawFee = await glideVaultInstance.withdrawFee.call();

        // calculate amount for withdraw
        const amountForWithdraw = new BN(balanceOf.toString()).mul(new BN(withdrawShare.toString())).div(new BN(totalShares.toString()));
        const feeAmountForWithdraw = amountForWithdraw.mul(new BN(withdrawFee.toString())).div(new BN(10000));
        const amountForWithdrawWithFee = amountForWithdraw.sub(feeAmountForWithdraw);
        //console.log("amountForWithdrawWithFee-"+amountForWithdrawWithFee.toString());

        await glideVaultInstance.withdraw(withdrawShare, {from: accounts[3]});

        // check balance after withdraw
        const glideBalanceAccounts3After = await glideTokenInstance.balanceOf.call(accounts[3]);
        //console.log("glideBalanceAccounts3After-" + glideBalanceAccounts3After.toString());

        assert.equal(new BN(glideBalanceAccounts3Before.toString()).add(new BN(amountForWithdrawWithFee.toString())).toString(), glideBalanceAccounts3After.toString(), "withdraw from glideVault is not correct");
    });

});