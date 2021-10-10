const {ethers} = require("ethers");

const BN = require('bn.js');

const FeeDistributor = artifacts.require("FeeDistributor");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const GlideToken = artifacts.require("GlideToken");
const GlideRouter = artifacts.require("GlideRouter");
const GlideFactory = artifacts.require("GlideFactory");
const GlidePair = artifacts.require("GlidePair");
const IERC20 = artifacts.require("IERC20");
const SwapRewardsChef = artifacts.require("SwapRewardsChef");
const MasterChef = artifacts.require("MasterChef");

contract("FeeDistributor test", accounts => {
    var feeDistributorInstance;
    var testTokenOneInstance;
    var testTokenTwoInstance;
    var glideTokenInstance;
    var wETHInstance;
    var glideRouterInstance;
    var concretePairInstance;
    var swapRewardsChefInstance;
    var masterChefInstance;

    var stakeGlideTokenValue;

    //set contract instances
    before(async () => {
        glideFactoryInstance = await GlideFactory.deployed();
        assert.ok(glideFactoryInstance);

        feeDistributorInstance = await FeeDistributor.deployed();
        assert.ok(feeDistributorInstance);

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

        await GlidePair.deployed();

        //Liquidity amount (prices range) - testTokenOne is 3 testTokenTwo;
        const valueForLiquidityTokenOne = ethers.utils.parseEther('15');
        const valueForLiquidityTokenTwo = ethers.utils.parseEther('5');
        const tstOneToTstTwoPrice = new BN(3);

        // create pair
        await glideFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);

        const approveValue = ethers.utils.parseEther('300');
        const valueForSent = ethers.utils.parseEther('100');
        stakeGlideTokenValue = ethers.utils.parseEther('50');
      
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
        const swapAmount = ethers.utils.parseEther('0.5');
        await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[2]});
        const onePercentSwapMiningAmount = new BN(swapAmount.toString()).div(new BN(100)).mul(new BN(5));
        const swapAmountOutMin = new BN(swapAmount.toString()).div(tstOneToTstTwoPrice).sub(onePercentSwapMiningAmount);
        await glideRouterInstance.swapExactTokensForTokens(swapAmount, 
            swapAmountOutMin,
            [testTokenOneInstance.address, testTokenTwoInstance.address],
            accounts[2],
            9000000000, 
            {from: accounts[2]});

        //swap amount
        await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[3]});
        await glideRouterInstance.swapExactTokensForTokens(swapAmount, 
            swapAmountOutMin,
            [testTokenOneInstance.address, testTokenTwoInstance.address],
            accounts[3],
            9000000000, 
            {from: accounts[3]});

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

        //swap amount
        await testTokenOneInstance.approve(glideRouterInstance.address, swapAmount, {from: accounts[3]});
        await glideRouterInstance.swapTokensForExactETH(swapAmount,
            ethers.utils.parseEther('5'),
            [testTokenOneInstance.address, wETHAddress],
            accounts[3],
            9000000000, 
            {from: accounts[3]});

        //add liquidity ETH
        await testTokenOneInstance.approve(glideRouterInstance.address, valueForAddLiquidityETHTokenOne, {from: accounts[1]});
        await glideRouterInstance.addLiquidityETH(testTokenOneInstance.address, 
            valueForAddLiquidityETHTokenOne.toString(),
            valueForAddLiquidityETHTokenOne.toString(),
            0,
            accounts[1],
            9000000000,
            {from:accounts[1], value:valueForAddLiquidityETHTwETH.toString()});
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
    });

    
    it("...should remove liquidity for TTONE - WETH from feeDistributor", async () => {
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, 
            wETHAddress);
        //console.log("pairAddress - " + pairAddress + " testTokenOne - " + testTokenOneInstance.address + " wETH - " + wETHAddress);
        //init instance for pair
        concretePairInstance = await GlidePair.at(pairAddress);

        const balanceBeforeRemoveLiquidity = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("balanceBeforeRemoveLiquidity-"+balanceBeforeRemoveLiquidity);

        // get testTokenOne balance before removeLiquidity
        const feeDistributorBalanceBeforeTONE = await testTokenOneInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceBefore-TONE-"+feeDistributorBalanceBeforeTONE.toString());

        // get testTokenTwo balance before removeLiquidity
        const feeDistributorBalanceBeforeTTWO = await testTokenTwoInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceBefore-TTWO-"+feeDistributorBalanceBeforeTTWO.toString());

        //remove liquidity from feeDistributor
        await feeDistributorInstance.removeLiquidity(glideRouterInstance.address,
            pairAddress);

        const balanceAfterRemoveLiquidity = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("balanceAfterRemoveLiquidity-" + balanceAfterRemoveLiquidity);

        // get testTokenOne balance after removeLiquidity
        const feeDistributorBalanceAfterTONE = await testTokenOneInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceAfter-TONE-"+feeDistributorBalanceAfterTONE.toString());

        // get testTokenTwo balance after removeLiquidity
        const feeDistributorBalanceAfterTTWO = await testTokenTwoInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceAfter-TTWO-"+feeDistributorBalanceAfterTTWO.toString());
        
        assert.equal(balanceAfterRemoveLiquidity.toNumber(), 0, "FeeDistributor for remove liquidity on balance is not working correct");
        assert.equal(feeDistributorBalanceBeforeTONE.toNumber() < feeDistributorBalanceAfterTONE.toNumber(), true, "FeeDistributor remove liquidity on testTokenOne is not working correct");
    });

    it("...should remove liquidity from feeDistributor", async () => {
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, 
            testTokenTwoInstance.address);
        //console.log("pairAddress - " + pairAddress + " testTokenOne - " + testTokenOneInstance.address + " testTokenTwo - " + testTokenTwoInstance.address);
        //init instance for pair
        concretePairInstance = await GlidePair.at(pairAddress);

        const balanceBeforeRemoveLiquidity = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("balanceBeforeRemoveLiquidity-"+balanceBeforeRemoveLiquidity);

        // get testTokenOne balance before removeLiquidity
        const feeDistributorBalanceBeforeTONE = await testTokenOneInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceBefore-TONE-"+feeDistributorBalanceBeforeTONE.toString());

        // get testTokenTwo balance before removeLiquidity
        const feeDistributorBalanceBeforeTTWO = await testTokenTwoInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceAfter-TTWO-"+feeDistributorBalanceBeforeTTWO.toString());

        //remove liquidity from feeDistributor
        await feeDistributorInstance.removeLiquidity(glideRouterInstance.address,
            pairAddress);

        const balanceAfterRemoveLiquidity = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("balanceAfterRemoveLiquidity-" + balanceAfterRemoveLiquidity);

        // get testTokenOne balance after removeLiquidity
        const feeDistributorBalanceAfterTONE = await testTokenOneInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceAfter-TONE-"+feeDistributorBalanceAfterTONE.toString());

        // get testTokenTwo balance after removeLiquidity
        const feeDistributorBalanceAfterTTWO = await testTokenTwoInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("feeDistributorBalanceAfter-TTWO-"+feeDistributorBalanceAfterTTWO.toString());
        
        assert.equal(balanceAfterRemoveLiquidity.toNumber(), 0, "FeeDistributor for remove liquidity on balance is not working correct");
        assert.equal(feeDistributorBalanceBeforeTONE.toNumber() < feeDistributorBalanceAfterTONE.toNumber(), true, "FeeDistributor remove liquidity on testTokenOne is not working correct");
        assert.equal(feeDistributorBalanceBeforeTTWO.toNumber() < feeDistributorBalanceAfterTTWO.toNumber(), true, "FeeDistributor remove liquidity on testTokenTwo is not working correct");     
    });

  

    it("...should sell tokens (directly testTokenOne - wETH) from feeDistributor", async () => {
        const pairAddress = await glideFactoryInstance.getPair(testTokenOneInstance.address, 
            wETHAddress);
        //console.log("pairAddress - " + pairAddress + " testTokenOne - " + testTokenOneInstance.address + " wETHAddress - " + wETHAddress);
        
        // get wETH address and wETH balance before sell tokens
        const wETHBalanceBefore = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("wETHBalanceBefore-"+wETHBalanceBefore.toString());

        //sell tokens from feeDistributor
        await feeDistributorInstance.sellTokens(glideRouterInstance.address,
        testTokenOneInstance.address,
        wETHAddress,
        [testTokenOneInstance.address, wETHAddress]);

        const wETHBalanceAfter = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("wETHBalanceAfter-"+wETHBalanceAfter.toString());

        assert.equal(new BN(wETHBalanceAfter).gt(new BN(wETHBalanceBefore)), true, "FeeDistributor sell tokens  (directly testTokenOne - wETH) not working correct");
    });

    it("...should sell tokens (testTokenTwo - wETH with testTokenOne connection) from feeDistributor", async () => {
        const pairAddress = await glideFactoryInstance.getPair(testTokenTwoInstance.address, 
            wETHAddress);
        //console.log("pairAddress - " + pairAddress + " testTokenOne - " + testTokenTwoInstance.address + " wETHAddress - " + wETHAddress);

        // get wETH address and wETH balance before sell tokens
        const wETHBalanceBefore = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("wETHBalanceBefore-"+wETHBalanceBefore.toString());

        //sell tokens from feeDistributor
        await feeDistributorInstance.sellTokens(glideRouterInstance.address,
            testTokenTwoInstance.address,
            wETHAddress,
            [testTokenTwoInstance.address, testTokenOneInstance.address, wETHAddress]);

        const wETHBalanceAfter = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("wETHBalanceAfter-"+wETHBalanceAfter.toString());

        assert.equal(new BN(wETHBalanceAfter).gt(new BN(wETHBalanceBefore)), true, "FeeDistributor sell tokens (testTokenTwo - wETH with testTokenOne path) not working correct");
    });

    it("...should stake(deposit) Glide token to swapRewardsChef", async () => {        
        // approve glideToken to swapRewardsChef and get balance before deposit
        await glideTokenInstance.approve(swapRewardsChefInstance.address, stakeGlideTokenValue, {from: accounts[3]});
        const glideTokenBalanceBefore = await glideTokenInstance.balanceOf.call(swapRewardsChefInstance.address);
        //console.log("glideTokenBalanceBefore-"+glideTokenBalanceBefore.toString());

        // stake (deposit) Glide token
        await swapRewardsChefInstance.deposit(stakeGlideTokenValue, {from: accounts[3]});

        // get balance after deposit
        const glideTokenBalanceAfter = await glideTokenInstance.balanceOf.call(swapRewardsChefInstance.address);
        //console.log("glideTokenBalanceAfter-"+glideTokenBalanceAfter.toString());

        assert.equal(new BN(glideTokenBalanceBefore.toString()).add(new BN(stakeGlideTokenValue.toString())).toString(), glideTokenBalanceAfter.toString(), "deposit Glide token to swapRewardsChef is not correct");
    });

    it("...should distribute fee", async () => {
        // wETH balance for swapRewardsChef contract before distribute fees
        const wETHBalanceBefore = await wETHInstance.balanceOf.call(swapRewardsChefInstance.address);
        //console.log("wETHBalanceBefore-" + wETHBalanceBefore);
        // wETH balance for feeDistributor contract
        const wETHBalanceFeeDistributor = await wETHInstance.balanceOf.call(feeDistributorInstance.address);

        //distribute fee
        await feeDistributorInstance.distributeFees();

        // wETH balance for swapRewardsChef contract after distribute fees
        const wETHBalanceAfter = await wETHInstance.balanceOf.call(swapRewardsChefInstance.address);
        //console.log("wETHBalanceAfter-" + wETHBalanceAfter);
        assert.equal(new BN(wETHBalanceFeeDistributor.toString()).sub(new BN(wETHBalanceBefore.toString())).toString(), wETHBalanceAfter.toString(), "FeeDistributor didn't correct distribute fees");
    });

    it("...should harvest from SwapRewardsChef", async () => {
        // get ETH balance before harvest 
        const ETHBalanceBefore = await web3.eth.getBalance(accounts[3]);
        // console.log("ETHBalanceBefore-" + ETHBalanceBefore);

        // harvet ETH from swapRewards
        const txnReceipt = await swapRewardsChefInstance.harvestFor(accounts[3], {from: accounts[3]});
        // get gasUsed
        const gasUsed = txnReceipt.receipt.gasUsed;

        // get informations about pool ETH - Glide
        const poolInfo = await swapRewardsChefInstance.poolInfo.call(0);
        const accRewardPerShare = poolInfo.accRewardPerShare;

        // calculate harvested ETH
        const harvestedETH = new BN(stakeGlideTokenValue.toString()).mul(new BN(accRewardPerShare.toString())).div(new BN("1000000000000000000"));
        // console.log(harvestedETH.toString());
        const ETHBalanceAfter = await web3.eth.getBalance(accounts[3]);
        //console.log("wETHBalanceAfter-" + ETHBalanceAfter);
        // balance before harvest + harvested - gasUsed == balance after harvest
        assert.equal(new BN(ETHBalanceBefore.toString()).add(harvestedETH).sub(new BN(gasUsed.toString())).toString(), ETHBalanceAfter.toString(), "harvest from SwapRewardsChef is not correct");
    });
});