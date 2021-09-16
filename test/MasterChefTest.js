const {ethers} = require("ethers");

const BN = require('bn.js');

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const GlideToken = artifacts.require("GlideToken");
const SugarToken = artifacts.require("Sugar");
const GlideRouter = artifacts.require("GlideRouter");
const GlideFactory = artifacts.require("GlideFactory");
const GlidePair = artifacts.require("GlidePair");
const MasterChef = artifacts.require("MasterChef");

contract("MasterChef test", accounts => {
    const provider = new ethers.providers.JsonRpcProvider();

    var testTokenOneInstance;
    var testTokenTwoInstance;
    var glideTokenInstance;
    var sugarTokenInstance;
    var glideRouterInstance;
    var masterChefInstance;

    // function for mine new blocks
    async function mineNBlocks(nBlock) {
        for(var counter = 0; counter < nBlock; counter++) {
            await provider.send("evm_mine", [] );
        }
    }

    //set contract instances
    before(async () => {
        glideFactoryInstance = await GlideFactory.deployed();
        assert.ok(glideFactoryInstance);

        testTokenOneInstance = await TestTokenOne.deployed();
        assert.ok(testTokenOneInstance);

        testTokenTwoInstance = await TestTokenTwo.deployed();
        assert.ok(testTokenTwoInstance);

        glideTokenInstance = await GlideToken.deployed();
        assert.ok(glideTokenInstance);

        sugarTokenInstance = await SugarToken.deployed();
        assert.ok(sugarTokenInstance);

        glideRouterInstance = await GlideRouter.deployed();
        assert.ok(glideRouterInstance);

        masterChefInstance = await MasterChef.deployed();
        assert.ok(masterChefInstance);

        await GlidePair.deployed();

        //Liquidity amount (prices range) - testTokenOne is 3 testTokenTwo;
        const valueForLiquidityTokenOne = ethers.utils.parseEther('15');
        const valueForLiquidityTokenTwo = ethers.utils.parseEther('5');
        const tstOneToTstTwoPrice = new BN(3);

        // create pair
        await glideFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);

        const approveValue = ethers.utils.parseEther('300');
        const valueForSent = ethers.utils.parseEther('100');
      
        // transfer testTokenOne to account[1],account[2], account[3];
        await testTokenOneInstance.approve(accounts[0], approveValue);
        await testTokenOneInstance.transferFrom(accounts[0], accounts[1], valueForSent);
        await testTokenOneInstance.transferFrom(accounts[0], accounts[2], valueForSent);
        await testTokenOneInstance.transferFrom(accounts[0], accounts[3], valueForSent);
  
        // transfer testTokenTwo to account[1],account[2], account[3];
        await testTokenTwoInstance.approve(accounts[0], approveValue);
        await testTokenTwoInstance.transferFrom(accounts[0], accounts[1], valueForSent);
        await testTokenTwoInstance.transferFrom(accounts[0], accounts[2], valueForSent);
        await testTokenTwoInstance.transferFrom(accounts[0], accounts[3], valueForSent);

        //add liquidity for accounts[1]
        await testTokenOneInstance.approve(glideRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
        await testTokenTwoInstance.approve(glideRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
        await glideRouterInstance.addLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            valueForLiquidityTokenOne.toString(),
            valueForLiquidityTokenTwo.toString(),
            0,
            0,
            accounts[1],
            9000000000,
            {from:accounts[1]});
        
        //add liquidity for accounts[2]
        await testTokenOneInstance.approve(glideRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[2]});
        await testTokenTwoInstance.approve(glideRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[2]});
        await glideRouterInstance.addLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            valueForLiquidityTokenOne.toString(),
            valueForLiquidityTokenTwo.toString(),
            0,
            0,
            accounts[2],
            9000000000,
            {from:accounts[2]});

        //add liquidity ETH
        const valueForAddLiquidityETHTokenOne = ethers.utils.parseEther('1');
        const valueForAddLiquidityETHTwETH = ethers.utils.parseEther('4');
        await testTokenOneInstance.approve(glideRouterInstance.address, valueForAddLiquidityETHTokenOne, {from: accounts[1]});
        await glideRouterInstance.addLiquidityETH(testTokenOneInstance.address, 
            valueForAddLiquidityETHTokenOne.toString(),
            valueForAddLiquidityETHTokenOne.toString(),
            valueForAddLiquidityETHTwETH.toString(),
            accounts[1],
            9000000000,
            {from:accounts[1], value:valueForAddLiquidityETHTwETH.toString()});
    
        //swap amount
        const swapAmount = ethers.utils.parseEther('1');
        await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[2]});
        const onePercentSwapMiningAmount = new BN(swapAmount.toString()).div(new BN(100)).mul(new BN(5));
        const swapAmountOutMin = new BN(swapAmount.toString()).div(tstOneToTstTwoPrice).sub(onePercentSwapMiningAmount);
        await glideRouterInstance.swapExactTokensForTokens(swapAmount, 
            swapAmountOutMin,
            [testTokenOneInstance.address, testTokenTwoInstance.address],
            accounts[2],
            9000000000, 
            {from: accounts[2]});

        //add liquidity
        await testTokenOneInstance.approve(glideRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
        await testTokenTwoInstance.approve(glideRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
        await glideRouterInstance.addLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            valueForLiquidityTokenOne.toString(),
            valueForLiquidityTokenTwo.toString(),
            0,
            0,
            accounts[1],
            9000000000,
            {from:accounts[1]});
    });

    
    it("...should add pair to MasterChef", async () => {
        // get pair address from factory
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, testTokenTwoInstance.address);

        // add pair to masterChef contract
        await masterChefInstance.add(1000, pairAddress, true);

        // get pair length
        const pairLength = await masterChefInstance.poolLength.call();

        // pair length equal to 2, because, in constructor is add pair for glide
        assert.equal(pairLength, 2, "add pair is not correct");
    });

    it("...should deposit liquidity pools token without mint", async () => {
        // get pair address
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, testTokenTwoInstance.address);
        const concretePairInstance = await GlidePair.at(pairAddress);

        // get liquidity token amounts for pairAddress for accounts[1] and masterChef contract before deposit
        const liquidityTokenAmountAccounts1Before = await concretePairInstance.balanceOf.call(accounts[1]);
        //console.log("liquidityTokenAccounts1-" + liquidityTokenAmountAccounts1Before.toString());
        const liquidityTokenAmountMasterChefBefore = await  concretePairInstance.balanceOf.call(masterChefInstance.address);
        //console.log("liquidityTokenmasterChefInstance-" + liquidityTokenAmountMasterChefBefore.toString());

        // approve to masterChef instance for deposit
        await concretePairInstance.approve(masterChefInstance.address, liquidityTokenAmountAccounts1Before, {from: accounts[1]});

        // deposit to pool with index 1
        await masterChefInstance.deposit(1, liquidityTokenAmountAccounts1Before, {from: accounts[1]});
       
        // get liquidity token amounts for pairAddress for accounts[1] and masterChef contract after deposit
        const liquidityTokenAmountAccounts1After = await concretePairInstance.balanceOf.call(accounts[1]);
        const liquidityTokenAmountMasterChefAfter = await concretePairInstance.balanceOf.call(masterChefInstance.address);

        // assert liquidity tokens before and after deposit
        assert.equal(new BN(liquidityTokenAmountAccounts1Before.toString()).sub(new BN(liquidityTokenAmountMasterChefBefore.toString())).toString(),
            new BN(liquidityTokenAmountMasterChefAfter.toString()).sub(new BN(liquidityTokenAmountAccounts1After.toString())).toString(), "deposit liquidity pools token is not correct");
    });

    it("...should deposit liquidity pools token with mint", async () => {
        // get pair address
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, testTokenTwoInstance.address);
        const concretePairInstance = await GlidePair.at(pairAddress);

        // get liquidity token amounts for pairAddress for accounts[2] before deposit
        const liquidityTokenAmountAccounts2Before = await concretePairInstance.balanceOf.call(accounts[2]);
        //console.log("liquidityTokenAccounts2-" + liquidityTokenAmountAccounts2Before.toString());

        // approve to masterChef instance for deposit
        await concretePairInstance.approve(masterChefInstance.address, liquidityTokenAmountAccounts2Before, {from: accounts[2]});
       
        // get glidePerBlock
        const glidePerBlock = await masterChefInstance.glidePerBlock.call();
        // get totalAllocPoint
        const totalAllocPoint = await masterChefInstance.totalAllocPoint.call();
        // get poolInfo about 1 index
        const poolInfoIndexOne = await masterChefInstance.poolInfo.call(1);
        // calculate glideReward (2 is fixed because 2 block minted from last deposit)
        const glideReward = new BN("2").mul(glidePerBlock).mul(poolInfoIndexOne.allocPoint).div(totalAllocPoint);
        const glideRewardSugar = glideReward.mul(new BN("650")).div(new BN("1000"));
        const glideRewardDevAddress = glideReward.mul(new BN("125")).div(new BN("1000"));
        const glideRewardTreasuryAddress = glideReward.mul(new BN("225")).div(new BN("1000"));
        //console.log("glideReward-"+glideReward.toString());

        // deposit to pool with index 1
        await masterChefInstance.deposit(1, liquidityTokenAmountAccounts2Before, {from: accounts[2]});

        // get liquidity token amounts for pairAddress for accounts[2] after deposit
        const liquidityTokenAmountAccounts2BAfter = await concretePairInstance.balanceOf.call(accounts[2]);
        // assert is all liquidity token amount send to masterChef
        assert.equal(liquidityTokenAmountAccounts2BAfter.toString(), "0", "deposit liquidity pools token is not correct");

        // get glideReward for sugar address
        const glideRewardRealAmount = await glideTokenInstance.balanceOf.call(sugarTokenInstance.address);
        // assert sugar token reward
        assert.equal(glideRewardRealAmount.toString(), glideRewardSugar.toString(), "glide reward mint for sugar token is not correct");
        //console.log("glideRewardSugar-"+glideRewardSugar.toString());

        const devAddress = await masterChefInstance.devaddr.call();
        // get glideReward for dev address (in this test, accounts[8] is dev address)
        const glideRewardDevAddressRealAmount = await glideTokenInstance.balanceOf.call(devAddress.toString());
        // assert reward for dev address
        assert.equal(glideRewardDevAddressRealAmount.toString(), glideRewardDevAddress.toString(), "glide reward mint for dev address is not correct");
        //console.log("glideRewardDevAddressRealAmount-"+glideRewardDevAddressRealAmount.toString());
        //console.log("glideRewardDevAddress-"+glideRewardDevAddress.toString());

        const treasuryAddress = await masterChefInstance.treasuryaddr.call();
        // get glideReward for treasury address (in this test, accounts[9] is treasury address)
        const glideRewardTreasuryAddressRealAmount = await glideTokenInstance.balanceOf.call(treasuryAddress);
        // assert reward for treasuryAddress
        assert.equal(glideRewardTreasuryAddressRealAmount.toString(), glideRewardTreasuryAddress.toString(), "glide reward mint for treasury address is not correct");
        //console.log("glideRewardTreasuryAddress-"+glideRewardTreasuryAddress.toString());

        // reward sum for two blocks and for 1000/1333 
        const rewardSum = new BN(glideRewardRealAmount.toString()).add(new BN(glideRewardDevAddressRealAmount.toString())).add(new BN(glideRewardTreasuryAddressRealAmount.toString()));
        // sum without 1000/1333
        const rewardSumWithoutPercent = rewardSum.mul(new BN("1333")).div(new BN("1000"));
        // that should be similar to 6, because reward for one block is similar 3 glide token
        assert.equal(rewardSumWithoutPercent > ethers.utils.parseEther('5.99') && rewardSumWithoutPercent < ethers.utils.parseEther('6.01'), true, "glide is not correct minted for two blocks")
        //console.log("rewardSumWithoutPercent-"+rewardSumWithoutPercent.toString());
    });

    /* Delete this unit because functions setReductionPeriod and setBonusReductionPeriod are deleted after audit
    it("...should check reward per block", async () => {
        // Get default values from contract
        const bonusReductionPeriod = await masterChefInstance.bonusReductionPeriod.call();
        const reductionPeriod = await masterChefInstance.reductionPeriod.call();
        const startBlock = await masterChefInstance.startBlock.call();
    
        // Setup for testing
        await masterChefInstance.setBonusReductionPeriod(3);
        await masterChefInstance.setReductionPeriod(6);
        await masterChefInstance.setStartBlock(2);

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(2, 4); // should be 6
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('6').toString(), "reward for 2 - 4 combination is not correct");
        //console.log("glideRewards-"+glideRewards.toString());

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(2, 5); //should be 9
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('9').toString(), "reward for 2 - 5 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(2, 6); //should be 11.25
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('11.25').toString(), "reward for 2 - 6 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(2, 12); //should be 3 * 3 + 6 * 2.25 + 1 * 1.9125 =  9 + 13.5 + 1.9125 = 24.4125
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('24.4125').toString(), "reward for 2 - 12 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(11, 12); // should be 1.9125
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('1.9125').toString(), "reward for 11 - 12 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(11, 13); // should be 3.825
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('3.825').toString(), "reward for 11 - 13 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(12, 13); // should be 1.9125
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('1.9125').toString(), "reward for 12 - 13 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(19, 20); // should be 1.625625
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('1.625625').toString(), "reward for 19 - 20 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(12, 20); // should be 5 * 1.9125 + 3 * 1.625625 = 9.5625 + 4.876875 = 14.439375
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('14.439375').toString(), "reward for 12 - 20 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(1000, 1500); // should be 0
        assert.equal(new BN(glideRewards.toString()).toString(), "0", "reward for 1000 - 1500 combination is not correct");

        var glideRewards = await masterChefInstance.getGlideRewardPerBlock(130, 131); // should be 0.872089449401573 (phase 22)
        assert.equal(new BN(glideRewards.toString()).toString(), ethers.utils.parseEther('0.0872089449401573').toString(), "reward for 130 - 131 combination is not correct");

        // Reset setup to default
        await masterChefInstance.setBonusReductionPeriod(bonusReductionPeriod);
        await masterChefInstance.setReductionPeriod(reductionPeriod);
        await masterChefInstance.setStartBlock(startBlock);
    }); 
    */

    it("...should withdraw Glide token", async() => {
        await mineNBlocks(100);

        const glideBalanceAccounts2BeforeWithdraw = await glideTokenInstance.balanceOf.call(accounts[2]);
        //console.log("glideBalanceAccounts2BeforeWithdraw-"+glideBalanceAccounts2BeforeWithdraw.toString());

        // withdraw amount
        const withdrawLPAmount = ethers.utils.parseEther('3');

        // withdraw
        await masterChefInstance.withdraw(1, withdrawLPAmount, {from: accounts[2]});

        const glideBalanceAccounts2AfterWithdraw = await glideTokenInstance.balanceOf.call(accounts[2]);
        //console.log("glideBalanceAccounts2AfterWithdraw-"+glideBalanceAccounts2AfterWithdraw.toString());

        //NOTE - it's hard to calculate exact amount that withdraw Glide token, because, for withdraw function used LP amount
        assert.equal(glideBalanceAccounts2AfterWithdraw > glideBalanceAccounts2BeforeWithdraw, true, "withdraw is not correct");
    });

    it("...should enter staking Glide token", async() => {
        // set staking amount
        const stakingAmount = ethers.utils.parseEther('1');

        // get sugar token balance before enterStaking
        const sugarTokenInstanceBefore = await sugarTokenInstance.balanceOf.call(accounts[2]);
        //console.log("sugarTokenInstanceBefore-"+sugarTokenInstanceBefore.toString());

        // approve to masterChef instance for enterStaking
        await glideTokenInstance.approve(masterChefInstance.address, stakingAmount, {from: accounts[2]});

        await masterChefInstance.enterStaking(stakingAmount, {from: accounts[2]});

        // get sugar token balance after enterStaking
        const sugarTokenInstanceAfter = await sugarTokenInstance.balanceOf.call(accounts[2]);
        //console.log("sugarTokenInstanceAfter-"+sugarTokenInstanceAfter.toString());

        assert.equal(new BN(sugarTokenInstanceAfter.toString()).sub(new BN(sugarTokenInstanceBefore.toString())).toString(), stakingAmount.toString(), "enterStaking to sugar token is not correct");
    });

    it("...should leaveStaking Glide token", async() => {
        const glideBalanceAccounts2BeforeWithdraw = await glideTokenInstance.balanceOf.call(accounts[2]);
        //console.log("glideBalanceAccounts2BeforeWithdraw-"+glideBalanceAccounts2BeforeWithdraw.toString());

        // withdraw amount
        const withdrawLPAmount = ethers.utils.parseEther('0.5');

        // withdraw
        await masterChefInstance.leaveStaking(withdrawLPAmount, {from: accounts[2]});

        const glideBalanceAccounts2AfterWithdraw = await glideTokenInstance.balanceOf.call(accounts[2]);
        //console.log("glideBalanceAccounts2AfterWithdraw-"+glideBalanceAccounts2AfterWithdraw.toString());

        //NOTE - it's hard to calculate exact amount that withdraw Glide token, because, for withdraw function used LP amount
        assert.equal(glideBalanceAccounts2AfterWithdraw > glideBalanceAccounts2BeforeWithdraw, true, "leaveStaking is not correct");
    });
});