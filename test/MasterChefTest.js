const {ethers} = require("ethers");

const BN = require('bn.js');

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const GlideToken = artifacts.require("GlideToken");
const SugarToken = artifacts.require("Sugar");
const OperaSwapRouter = artifacts.require("OperaSwapRouter");
const OperaSwapFactory = artifacts.require("OperaSwapFactory");
const OperaSwapPair = artifacts.require("OperaSwapPair");
const IERC20 = artifacts.require("IERC20");
const SwapRewardsChef = artifacts.require("SwapRewardsChef");
const MasterChef = artifacts.require("MasterChef");

contract("MasterChef test", accounts => {
    var testTokenOneInstance;
    var testTokenTwoInstance;
    var glideTokenInstance;
    var sugarTokenInstance;
    var operaSwapRouterInstance;
    var swapRewardsChefInstance;
    var masterChefInstance;

    //set contract instances
    before(async () => {
        operaSwapFactoryInstance = await OperaSwapFactory.deployed();
        assert.ok(operaSwapFactoryInstance);

        testTokenOneInstance = await TestTokenOne.deployed();
        assert.ok(testTokenOneInstance);

        testTokenTwoInstance = await TestTokenTwo.deployed();
        assert.ok(testTokenTwoInstance);

        glideTokenInstance = await GlideToken.deployed();
        assert.ok(glideTokenInstance);

        sugarTokenInstance = await SugarToken.deployed();
        assert.ok(sugarTokenInstance);

        operaSwapRouterInstance = await OperaSwapRouter.deployed();
        assert.ok(operaSwapRouterInstance);

        swapRewardsChefInstance = await SwapRewardsChef.deployed();
        assert.ok(swapRewardsChefInstance);

        masterChefInstance = await MasterChef.deployed();
        assert.ok(masterChefInstance);

        await OperaSwapPair.deployed();

        //Liquidity amount (prices range) - testTokenOne is 3 testTokenTwo;
        const valueForLiquidityTokenOne = ethers.utils.parseEther('15');
        const valueForLiquidityTokenTwo = ethers.utils.parseEther('5');
        const tstOneToTstTwoPrice = new BN(3);

        // create pair
        await operaSwapFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);

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
        await testTokenOneInstance.approve(operaSwapRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
        await testTokenTwoInstance.approve(operaSwapRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
        await operaSwapRouterInstance.addLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            valueForLiquidityTokenOne.toString(),
            valueForLiquidityTokenTwo.toString(),
            0,
            0,
            accounts[1],
            9000000000,
            {from:accounts[1]});
        
        //add liquidity for accounts[2]
        await testTokenOneInstance.approve(operaSwapRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[2]});
        await testTokenTwoInstance.approve(operaSwapRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[2]});
        await operaSwapRouterInstance.addLiquidity(testTokenOneInstance.address, 
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
        await testTokenOneInstance.approve(operaSwapRouterInstance.address, valueForAddLiquidityETHTokenOne, {from: accounts[1]});
        await operaSwapRouterInstance.addLiquidityETH(testTokenOneInstance.address, 
            valueForAddLiquidityETHTokenOne.toString(),
            valueForAddLiquidityETHTokenOne.toString(),
            valueForAddLiquidityETHTwETH.toString(),
            accounts[1],
            9000000000,
            {from:accounts[1], value:valueForAddLiquidityETHTwETH.toString()});
    
        //swap amount
        const swapAmount = ethers.utils.parseEther('1');
        await testTokenOneInstance.approve(operaSwapRouterInstance.address, swapAmount, {from: accounts[2]});
        const onePercentSwapMiningAmount = new BN(swapAmount.toString()).div(new BN(100)).mul(new BN(5));
        const swapAmountOutMin = new BN(swapAmount.toString()).div(tstOneToTstTwoPrice).sub(onePercentSwapMiningAmount);
        await operaSwapRouterInstance.swapExactTokensForTokens(swapAmount, 
            swapAmountOutMin,
            [testTokenOneInstance.address, testTokenTwoInstance.address],
            accounts[2],
            9000000000, 
            {from: accounts[2]});

        //add liquidity
        await testTokenOneInstance.approve(operaSwapRouterInstance.address, valueForLiquidityTokenOne, {from: accounts[1]});
        await testTokenTwoInstance.approve(operaSwapRouterInstance.address, valueForLiquidityTokenTwo, {from: accounts[1]});
        await operaSwapRouterInstance.addLiquidity(testTokenOneInstance.address, 
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
        const pairAddress = await operaSwapFactoryInstance.getPair(testTokenOneInstance.address, testTokenTwoInstance.address);

        // add pair to masterChef contract
        await masterChefInstance.add(1000, pairAddress, true);

        // get pair length
        const pairLength = await masterChefInstance.poolLength.call();

        // pair length equal to 2, because, in constructor is add pair for cake
        assert.equal(pairLength, 2, "add pair is not correct");
    });

    it("...should deposit liquidity pools token without mint", async () => {
        // get pair address
        const pairAddress = await operaSwapFactoryInstance.getPair(testTokenOneInstance.address, testTokenTwoInstance.address);
        const concretePairInstance = await OperaSwapPair.at(pairAddress);

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
        const pairAddress = await operaSwapFactoryInstance.getPair(testTokenOneInstance.address, testTokenTwoInstance.address);
        const concretePairInstance = await OperaSwapPair.at(pairAddress);

        // get liquidity token amounts for pairAddress for accounts[2] before deposit
        const liquidityTokenAmountAccounts2Before = await concretePairInstance.balanceOf.call(accounts[2]);
        //console.log("liquidityTokenAccounts2-" + liquidityTokenAmountAccounts2Before.toString());

        // approve to masterChef instance for deposit
        await concretePairInstance.approve(masterChefInstance.address, liquidityTokenAmountAccounts2Before, {from: accounts[2]});

        // deposit to pool with index 1
        await debug(masterChefInstance.deposit(1, liquidityTokenAmountAccounts2Before, {from: accounts[2]}));
       
        // get glidePerBlock
        const glidePerBlock = await masterChefInstance.cakePerBlock.call();
        // get totalAllocPoint
        const totalAllocPoint = await masterChefInstance.totalAllocPoint.call();
        // get poolInfo about 1 index
        const poolInfoIndexOne = await masterChefInstance.poolInfo.call(1);
        // calculate cakeReward (2 is fixed because 2 block minted from last deposit)
        const glideReward = new BN("2").mul(glidePerBlock).mul(poolInfoIndexOne.allocPoint).div(totalAllocPoint);
        const glideRewardDevAddress = glideReward.mul(new BN("10")).div(new BN("52"));
        const glideRewardTreasuryAddress = glideReward.mul(new BN("100")).div(new BN("288"));
        //console.log("glideReward-"+glideReward.toString());

        // get liquidity token amounts for pairAddress for accounts[2] after deposit
        const liquidityTokenAmountAccounts2BAfter = await concretePairInstance.balanceOf.call(accounts[2]);
        // assert is all liquidity token amount send to masterChef
        assert.equal(liquidityTokenAmountAccounts2BAfter.toString(), "0", "deposit liquidity pools token is not correct");

        // get glideReward for sugar address
        const glideRewardRealAmount = await glideTokenInstance.balanceOf.call(sugarTokenInstance.address);
        // assert sugar token reward
        assert.equal(glideRewardRealAmount.toString(), glideReward.toString(), "glide reward mint for sugar token is not correct");

        // get glideReward for dev address (in this test, accounts[8] is dev address)
        const glideRewardDevAddressRealAmount = await glideTokenInstance.balanceOf.call(accounts[8]);
        // assert reward for dev address
        assert.equal(glideRewardDevAddressRealAmount.toString(), glideRewardDevAddress.toString(), "glide reward mint for dev address is not correct");

        // get glideReward for treasury address (in this test, accounts[9] is treasury address)
        const glideRewardTreasuryAddressRealAmount = await glideTokenInstance.balanceOf.call(accounts[9]);
        // assert reward for treasuryAddress
        assert.equal(glideRewardTreasuryAddressRealAmount.toString(), glideRewardTreasuryAddress.toString(), "glide reward mint for treasury address is not correct");

        // reward sum for two blocks and for 1000/1333 
        const rewardSum = new BN(glideRewardRealAmount.toString()).add(new BN(glideRewardDevAddressRealAmount.toString())).add(new BN(glideRewardTreasuryAddressRealAmount.toString()));
        // sum without 1000/1333
        const rewardSumWithoutPercent = rewardSum.mul(new BN("1333")).div(new BN("1000"));
        // that should be similar to 6, because reward for one block is similar 3 glide token
        assert.equal(rewardSumWithoutPercent > ethers.utils.parseEther('6') && rewardSumWithoutPercent < ethers.utils.parseEther('6.01'), true, "glide is not correct minted for two blocks")
    });
});