const {ethers} = require("ethers");

const BN = require('bn.js');

const FeeDistributor = artifacts.require("FeeDistributor");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const OperaToken = artifacts.require("OperaToken");
const OperaSwapRouter = artifacts.require("OperaSwapRouter");
const OperaSwapFactory = artifacts.require("OperaSwapFactory");
const OperaSwapPair = artifacts.require("OperaSwapPair");
const IERC20 = artifacts.require("IERC20");
const SwapRewardsChef = artifacts.require("SwapRewardsChef");

contract("FeeDistributor test", accounts => {
    var feeDistributorInstance;
    var testTokenOneInstance;
    var testTokenTwoInstance;
    var operaTokenInstance;
    var wETHInstance;
    var operaSwapRouterInstance;
    var concretePairInstance;
    var swapRewardsChefInstance;

    var stakeOperaToken;

    //set contract instances
    before(async () => {
        operaSwapFactoryInstance = await OperaSwapFactory.deployed();
        assert.ok(operaSwapFactoryInstance);

        feeDistributorInstance = await FeeDistributor.deployed();
        assert.ok(feeDistributorInstance);

        testTokenOneInstance = await TestTokenOne.deployed();
        assert.ok(testTokenOneInstance);

        testTokenTwoInstance = await TestTokenTwo.deployed();
        assert.ok(testTokenTwoInstance);

        operaTokenInstance = await OperaToken.deployed();
        assert.ok(operaTokenInstance);

        operaSwapRouterInstance = await OperaSwapRouter.deployed();
        assert.ok(operaSwapRouterInstance);

        swapRewardsChefInstance = await SwapRewardsChef.deployed();
        assert.ok(swapRewardsChefInstance);

        wETHAddress = await operaSwapRouterInstance.WETH();
        wETHInstance = await IERC20.at(wETHAddress);

        await OperaSwapPair.deployed();

        //Liquidity amount (prices range) - testTokenOne is 3 testTokenTwo;
        const valueForLiquidityTokenOne = ethers.utils.parseEther('15');
        const valueForLiquidityTokenTwo = ethers.utils.parseEther('5');
        const tstOneToTstTwoPrice = new BN(3);

        // create pair
        await operaSwapFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);

        const approveValue = ethers.utils.parseEther('300');
        const valueForSent = ethers.utils.parseEther('100');
        stakeOperaToken = ethers.utils.parseEther('50');
      
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

        // transfer operaToken to account[3] for deposit
        await operaTokenInstance.mint(accounts[3], ethers.utils.parseEther('50'));

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

    it("...should remove liquidity from feeDistributor", async () => {
        const pairAddress = await operaSwapFactoryInstance.getPair(testTokenOneInstance.address, 
            testTokenTwoInstance.address);
        //console.log("pairAddress - " + pairAddress + " testTokenOne - " + testTokenOneInstance.address + " testTokenTwo - " + testTokenTwoInstance.address);
        //init instance for pair
        concretePairInstance = await OperaSwapPair.at(pairAddress);

        const balanceBeforeRemoveLiquidity = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
        console.log("balanceBeforeRemoveLiquidity-"+balanceBeforeRemoveLiquidity);

        // get testTokenOne balance before removeLiquidity
        const feeDistributorBalanceBeforeTONE = await testTokenOneInstance.balanceOf.call(feeDistributorInstance.address);
        console.log("feeDistributorBalanceBefore-TONE-"+feeDistributorBalanceBeforeTONE.toString());

        // get testTokenTwo balance before removeLiquidity
        const feeDistributorBalanceBeforeTTWO = await testTokenTwoInstance.balanceOf.call(feeDistributorInstance.address);
        console.log("feeDistributorBalanceAfter-TTWO-"+feeDistributorBalanceBeforeTTWO.toString());

        //remove liquidity from feeDistributor
        await feeDistributorInstance.removeLiquidity(operaSwapRouterInstance.address,
            pairAddress);

        const balanceAfterRemoveLiquidity = await concretePairInstance.balanceOf.call(feeDistributorInstance.address);
        console.log("balanceAfterRemoveLiquidity-" + balanceAfterRemoveLiquidity);

        // get testTokenOne balance after removeLiquidity
        const feeDistributorBalanceAfterTONE = await testTokenOneInstance.balanceOf.call(feeDistributorInstance.address);
        console.log("feeDistributorBalanceAfter-TONE-"+feeDistributorBalanceAfterTONE.toString());

        // get testTokenTwo balance after removeLiquidity
        const feeDistributorBalanceAfterTTWO = await testTokenTwoInstance.balanceOf.call(feeDistributorInstance.address);
        console.log("feeDistributorBalanceAfter-TTWO-"+feeDistributorBalanceAfterTTWO.toString());
        
        assert.equal(balanceAfterRemoveLiquidity.toNumber(), 0, "FeeDistributor for remove liquidity on balance is not working correct");
        assert.equal(feeDistributorBalanceBeforeTONE.toNumber() < feeDistributorBalanceAfterTONE.toNumber(), true, "FeeDistributor remove liquidity on testTokenOne is not working correct");
        assert.equal(feeDistributorBalanceBeforeTTWO.toNumber() < feeDistributorBalanceAfterTTWO.toNumber(), true, "FeeDistributor remove liquidity on testTokenTwo is not working correct");
    });

  
    it("...should sell tokens (directly testTokenOne - wETH) from feeDistributor", async () => {
        // get wETH address and wETH balance before sell tokens
        const wETHBalanceBefore = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log(wETHBalanceBefore.toString());

        //sell tokens from feeDistributor
        await feeDistributorInstance.sellTokens(operaSwapRouterInstance.address,
        testTokenOneInstance.address,
        wETHAddress,
        [testTokenOneInstance.address, wETHAddress]);

        const wETHBalanceAfter = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log(wETHBalanceAfter.toString());

        assert.equal(wETHBalanceAfter > wETHBalanceBefore, true, "FeeDistributor sell tokens  (directly testTokenOne - wETH) not working correct");
    });

    it("...should sell tokens (testTokenTwo - wETH with testTokenOne connection) from feeDistributor", async () => {
        // get wETH address and wETH balance before sell tokens
        const wETHBalanceBefore = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("wETHBalanceBefore-"+wETHBalanceBefore.toString());

        //sell tokens from feeDistributor
        await feeDistributorInstance.sellTokens(operaSwapRouterInstance.address,
            testTokenTwoInstance.address,
            wETHAddress,
            [testTokenTwoInstance.address, testTokenOneInstance.address, wETHAddress]);

        const wETHBalanceAfter = await wETHInstance.balanceOf.call(feeDistributorInstance.address);
        //console.log("wETHBalanceAfter-"+wETHBalanceAfter.toString());

        assert.equal(wETHBalanceAfter > wETHBalanceBefore, true, "FeeDistributor sell tokens (testTokenTwo - wETH with testTokenOne path) not working correct");
    });

    it("...should stake(deposit) Opera token to swapRewardsChef", async () => {        
        // approve operaToken to swapRewardsChef and get balance before deposit
        await operaTokenInstance.approve(swapRewardsChefInstance.address, stakeOperaToken, {from: accounts[3]});
        const operaTokenBalanceBefore = await operaTokenInstance.balanceOf.call(swapRewardsChefInstance.address);
        //console.log("operaTokenBalanceBefore-"+operaTokenBalanceBefore.toString());

        // stake (deposit) Opera token
        swapRewardsChefInstance.deposit(stakeOperaToken, {from: accounts[3]});

        // get balance after deposit
        const operaTokenBalanceAfter = await operaTokenInstance.balanceOf.call(swapRewardsChefInstance.address);
        //console.log("operaTokenBalanceAfter-"+operaTokenBalanceAfter.toString());

        assert.equal(new BN(operaTokenBalanceBefore.toString()).add(new BN(stakeOperaToken.toString())).toString(), operaTokenBalanceAfter.toString(), "deposit Opera token to swapRewardsChef is not correct");
        
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
        //console.log("ETHBalanceBefore-" + ETHBalanceBefore);

        // harvet ETH from swapRewards
        const txnReceipt = await debug(swapRewardsChefInstance.harvestFor(accounts[3], {from: accounts[3]}));
        // get gasUsed
        const gasUsed = txnReceipt.receipt.gasUsed;

        // get informations about pool ETH - Opera
        const poolInfo = await swapRewardsChefInstance.poolInfo.call(0);
        const accRewardPerShare = poolInfo.accRewardPerShare;

        // calculate harvested ETH
        const harvestedETH = new BN(stakeOperaToken.toString()).mul(new BN(accRewardPerShare.toString())).div(new BN("1000000000000"));
        //console.log(harvestedETH.toString());
        const ETHBalanceAfter = await web3.eth.getBalance(accounts[3]);
        //console.log("wETHBalanceAfter-" + ETHBalanceAfter);
        // balance before harvest + harvested - gasUsed == balance after harvest
        assert.equal(new BN(ETHBalanceBefore.toString()).add(harvestedETH).sub(new BN(gasUsed.toString())).toString(), ETHBalanceAfter.toString(), "harvest from SwapRewardsChef is not correct");
    });
});